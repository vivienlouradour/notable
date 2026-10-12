import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { PouchDbService } from './pouchdb.service';
import { POUCHDB_FACTORY } from './pouchdb.factory';

describe('PouchDbService', () => {
  const db = {
    get: vi.fn(),
    allDocs: vi.fn(),
    put: vi.fn(),
    remove: vi.fn(),
    changes: vi.fn(),
    sync: vi.fn(),
  };
  const createDatabase = vi.fn(() => db);
  const doc = { _id: 'note:test', _rev: '1-test', title: 'Note' };
  let service: PouchDbService;
  let onChange: (change: {
    id: string;
    deleted?: boolean;
    doc?: typeof doc;
  }) => void;
  let onError: (error: unknown) => void;
  let cancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    cancel = vi.fn();
    db.get.mockResolvedValue(doc);
    db.allDocs.mockResolvedValue({ rows: [] });
    db.put.mockResolvedValue({ ok: true, id: doc._id, rev: '2-test' });
    db.remove.mockResolvedValue({ ok: true, id: doc._id, rev: '2-test' });
    db.changes.mockReturnValue({
      on: (event: string, callback: typeof onChange & typeof onError) => {
        if (event === 'change') onChange = callback;
        else if (event === 'error') onError = callback;
      },
      cancel,
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: PouchDbService, useClass: PouchDbService },
        { provide: POUCHDB_FACTORY, useValue: createDatabase },
      ],
    });
    service = TestBed.inject(PouchDbService);
  });

  it('opens the configured local database without a remote connection', () => {
    expect(createDatabase).toHaveBeenCalledOnce();
    expect(createDatabase).toHaveBeenCalledWith(environment.localDbName);
    expect(db.sync).not.toHaveBeenCalled();
  });

  it('reads a document using its id', async () => {
    expect(await service.get(doc._id)).toEqual(doc);
    expect(db.get).toHaveBeenCalledWith(doc._id);
  });

  it('returns documents from allDocs and skips rows without a document', async () => {
    db.allDocs.mockResolvedValue({
      rows: [{ id: 'missing' }, { id: doc._id, doc }],
    });
    expect(await service.gets()).toEqual([doc]);
    expect(db.allDocs).toHaveBeenCalledWith({ include_docs: true });
  });

  it.each(['get', 'gets', 'put', 'remove'] as const)(
    'propagates a database %s failure',
    async operation => {
      const error = new Error('database failure');
      (operation === 'gets' ? db.allDocs : db[operation]).mockRejectedValueOnce(
        error
      );
      const action =
        operation === 'get'
          ? service.get(doc._id)
          : operation === 'gets'
            ? service.gets()
            : service[operation](doc);
      await expect(action).rejects.toBe(error);
    }
  );

  it('persists the document with its revision and returns the database response', async () => {
    const response = await service.put(doc);
    expect(db.put).toHaveBeenCalledWith(doc);
    expect(response).toEqual({ ok: true, id: doc._id, rev: '2-test' });
  });

  it('removes the document with its revision', async () => {
    await service.remove(doc);
    expect(db.remove).toHaveBeenCalledWith(doc);
  });

  it('starts listening only on subscription and filters changes by document type', () => {
    const changes = service.changes('note');
    expect(db.changes).not.toHaveBeenCalled();
    const receive = vi.fn();
    const subscription = changes.subscribe(receive);
    expect(db.changes).toHaveBeenCalledWith({
      since: 'now',
      live: true,
      include_docs: true,
    });
    onChange({ id: 'other:test', doc });
    expect(receive).not.toHaveBeenCalled();
    onChange({ id: doc._id, doc });
    expect(receive).toHaveBeenCalledWith({ id: doc._id, deleted: false, doc });
    subscription.unsubscribe();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('forwards tombstones without documents when no filter is specified', () => {
    const receive = vi.fn();
    const subscription = service.changes().subscribe(receive);
    onChange({ id: 'other:test', deleted: true });
    expect(receive).toHaveBeenCalledWith({
      id: 'other:test',
      deleted: true,
      doc: undefined,
    });
    subscription.unsubscribe();
  });

  it('forwards feed errors and cancels the underlying subscription', () => {
    const receiveError = vi.fn();
    service.changes().subscribe({ error: receiveError });
    const error = new Error('feed failure');
    onError(error);
    expect(receiveError).toHaveBeenCalledWith(error);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('enables continuous replication with retry only when explicitly requested', () => {
    const remote = TestBed.inject(POUCHDB_FACTORY)(
      'https://example.test/notes'
    );
    const handle = { cancel: vi.fn() };
    db.sync.mockReturnValue(handle);
    expect(service.syncWith(remote)).toBe(handle);
    expect(db.sync).toHaveBeenCalledWith(remote, { live: true, retry: true });
  });
});
