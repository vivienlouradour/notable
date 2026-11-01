import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PouchDbService } from '../../core/server/pouchdb/pouchdb.service';
import { DocumentChange } from '../../core/server/pouchdb/pouchdb.model';
import { makeNote } from '../../../testing/note-fixtures';
import { NoteStore } from './note.store';

interface NoteDocument {
  _id: string;
  _rev: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  deleted: boolean;
  deletedAt?: string;
  tags: string[];
}

function document(overrides: Partial<NoteDocument> = {}): NoteDocument {
  return {
    _id: 'note:test',
    _rev: '1-test',
    title: 'Test note',
    content: 'Test content',
    createdAt: '2026-01-01T12:00:00.000Z',
    deleted: false,
    tags: [],
    ...overrides,
  };
}

describe('NoteStore', () => {
  let changes: Subject<DocumentChange<NoteDocument>>;
  let db: {
    gets: ReturnType<typeof vi.fn<() => Promise<NoteDocument[]>>>;
    get: ReturnType<typeof vi.fn<(id: string) => Promise<NoteDocument>>>;
    put: ReturnType<
      typeof vi.fn<(doc: unknown) => Promise<PouchDB.Core.Response>>
    >;
    changes: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    changes = new Subject();
    db = {
      gets: vi.fn<() => Promise<NoteDocument[]>>().mockResolvedValue([]),
      get: vi
        .fn<(id: string) => Promise<NoteDocument>>()
        .mockResolvedValue(document()),
      put: vi
        .fn<(doc: unknown) => Promise<PouchDB.Core.Response>>()
        .mockResolvedValue({ ok: true, id: 'note:created', rev: '2-test' }),
      changes: vi.fn(() => changes.asObservable()),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: NoteStore, useClass: NoteStore },
        { provide: PouchDbService, useValue: db },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  async function createStore() {
    const store = TestBed.inject(NoteStore);
    await Promise.resolve();
    return store;
  }

  it('loads local notes, excludes soft deletions and converts serialized dates', async () => {
    db.gets.mockResolvedValue([
      document({ updatedAt: '2026-02-01T12:00:00Z', tags: ['#work'] }),
      document({ _id: 'note:deleted', deleted: true }),
    ]);
    const store = await createStore();
    expect(store.notes()).toEqual([
      makeNote({
        metadata: {
          createdAt: new Date('2026-01-01T12:00:00Z'),
          updatedAt: new Date('2026-02-01T12:00:00Z'),
          tags: ['#work'],
        },
      }),
    ]);
    expect(db.changes).toHaveBeenCalledWith('note');
  });

  it('starts with an empty library when the local database is empty', async () => {
    expect((await createStore()).notes()).toEqual([]);
  });

  it('reads a note by id and converts its dates', async () => {
    const store = await createStore();
    expect(await store.get('note:test')).toEqual(makeNote());
    expect(db.get).toHaveBeenCalledWith('note:test');
  });

  it('propagates a failed read to the caller', async () => {
    const error = new Error('not found');
    db.get.mockRejectedValue(error);
    await expect((await createStore()).get('missing')).rejects.toBe(error);
  });

  it('creates a local document with a timestamp, tags and returns the persisted id', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-01T12:34:56Z'));
    const store = await createStore();
    expect(
      await store.createNote('Meeting', 'Discuss #work and #project-1')
    ).toBe('note:created');
    expect(db.put).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'note:2026-03-01T12:34:56.000Z',
        createdAt: '2026-03-01T12:34:56.000Z',
        title: 'Meeting',
        content: 'Discuss #work and #project-1',
        tags: ['#work', '#project-1'],
      })
    );
  });

  it('creates an empty tag list when content has no tags', async () => {
    await (await createStore()).createNote('Plain note', 'No tags here');
    expect(db.put).toHaveBeenCalledWith(expect.objectContaining({ tags: [] }));
  });

  it('keeps only one occurrence of each tag when creating a note', async () => {
    await (await createStore()).createNote('Tags', '#work #other #work #other');
    expect(db.put).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['#work', '#other'] })
    );
  });

  it('deduplicates tags when updating a note', async () => {
    await (
      await createStore()
    ).updateNote(makeNote(), { content: '#work #work' });
    expect(db.put).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['#work'] })
    );
  });

  it('removes stored tags when content becomes empty', async () => {
    await (
      await createStore()
    ).updateNote(makeNote({ content: '#work' }), { content: '' });
    expect(db.put).toHaveBeenCalledWith(
      expect.objectContaining({ content: '', tags: [] })
    );
  });

  it('preserves the id, revision and creation date when updating and recalculates stored tags', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
    const note = makeNote();
    const store = await createStore();
    await store.updateNote(note, { title: 'Updated', content: 'New #tag' });
    expect(db.put).toHaveBeenCalledWith({
      _id: note.id,
      _rev: note.rev,
      title: 'Updated',
      content: 'New #tag',
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-03-01T12:00:00.000Z',
      deleted: false,
      tags: ['#tag'],
    });
    expect(note).toEqual(makeNote());
  });

  it('preserves unchanged fields on a partial update', async () => {
    const note = makeNote();
    const updated = await (
      await createStore()
    ).updateNote(note, { title: 'New title' });
    expect(updated.title).toBe('New title');
    expect(updated.content).toBe(note.content);
    expect(updated.metadata.createdAt).toEqual(note.metadata.createdAt);
  });

  it('soft deletes the document while retaining its id and revision', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
    const note = makeNote();
    await (await createStore()).deleteNote(note);
    expect(db.put).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: note.id,
        _rev: note.rev,
        deleted: true,
        deletedAt: '2026-03-01T12:00:00.000Z',
      })
    );
    expect(note).toEqual(makeNote());
  });

  it.each(['create', 'update', 'delete'] as const)(
    'propagates a failed %s without changing local notes',
    async operation => {
      db.gets.mockResolvedValue([document()]);
      const store = await createStore();
      const error = new Error('write failed');
      db.put.mockRejectedValue(error);
      const action =
        operation === 'create'
          ? store.createNote('New', 'Content')
          : operation === 'update'
            ? store.updateNote(makeNote(), { title: 'New' })
            : store.deleteNote(makeNote());
      await expect(action).rejects.toBe(error);
      expect(store.notes()).toEqual([makeNote()]);
    }
  );

  it('adds and updates notes from database changes without duplicating them', async () => {
    const store = await createStore();
    changes.next({ id: 'note:test', deleted: false, doc: document() });
    expect(store.notes()).toEqual([makeNote()]);
    changes.next({
      id: 'note:test',
      deleted: false,
      doc: document({ _rev: '2-test', title: 'Remote update' }),
    });
    expect(store.notes()).toEqual([
      makeNote({ rev: '2-test', title: 'Remote update' }),
    ]);
  });

  it.each(['tombstone', 'soft deletion'] as const)(
    'removes a note following a %s change',
    async kind => {
      db.gets.mockResolvedValue([document()]);
      const store = await createStore();
      changes.next(
        kind === 'tombstone'
          ? { id: 'note:test', deleted: true }
          : {
              id: 'note:test',
              deleted: false,
              doc: document({ deleted: true }),
            }
      );
      expect(store.notes()).toEqual([]);
    }
  );

  it('unsubscribes from database changes when the injector is destroyed', async () => {
    await createStore();
    expect(changes.observed).toBe(true);
    TestBed.resetTestingModule();
    expect(changes.observed).toBe(false);
  });
});
