import { inject, Injectable, signal } from '@angular/core';
import { Note, NoteMetadata } from './note.model';
import { PouchDbService } from '../../core/server/pouchdb/pouchdb.service';
import { BaseDocument } from '../../core/server/pouchdb/pouchdb.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface NoteDocument
  extends
    Omit<Note, 'id' | 'rev' | 'metadata'>,
    BaseDocument,
    PouchDB.Core.IdMeta,
    PouchDB.Core.GetMeta {
  createdAt: string;
  updatedAt?: string;
  deleted: boolean;
  deletedAt?: string;
  tags: string[];
}

type NoteChanges = Omit<Partial<Note>, 'metadata'> & {
  metadata?: Partial<NoteMetadata>;
};

@Injectable({ providedIn: 'root' })
export class NoteStore {
  private readonly dbService = inject(PouchDbService);
  private readonly noteDocumentIdentifier = 'note';
  private readonly _notes = signal<Note[]>([]);

  public readonly notes = this._notes.asReadonly();

  constructor() {
    // Load initial list of notes
    this.loadNotes();

    // Listen to changes
    this.dbService
      .changes<NoteDocument>(this.noteDocumentIdentifier)
      .pipe(takeUntilDestroyed())
      .subscribe(change => {
        this._notes.update(current => {
          if (change.deleted || !change.doc || change.doc.deleted) {
            return current.filter(note => note.id !== change.id);
          }

          const note = this.toNote(change.doc);
          const index = current.findIndex(n => n.id === note.id);

          if (index >= 0) {
            return current.map((n, i) => (i === index ? note : n));
          }

          return [...current, note];
        });
      });
  }

  public async get(id: string): Promise<Note> {
    const noteDocument = await this.dbService.get<NoteDocument>(id);

    return this.toNote(noteDocument);
  }

  public async createNote(title: string, content?: string): Promise<string> {
    const date = new Date().toISOString();
    const id = `${this.noteDocumentIdentifier}:${date}`;
    const tags = this.parseTags(content);
    const note = {
      title,
      content,
      _id: id,
      createdAt: date,
      tags,
    } as NoteDocument;

    const resp = await this.dbService.put(note);
    return resp.id;
  }

  public async updateNote(note: Note, changes: NoteChanges): Promise<Note> {
    const updatedNote = {
      ...note,
      ...changes,
      metadata: {
        ...note.metadata,
        ...changes.metadata,
      },
    };

    const noteDocument = this.toDocument(updatedNote);
    await this.dbService.put(noteDocument);

    return updatedNote;
  }

  public async deleteNote(note: Note): Promise<void> {
    const noteDocument = this.toDocument(note);
    noteDocument.deleted = true;
    noteDocument.deletedAt = new Date().toISOString();

    await this.dbService.put(noteDocument);
  }

  private async loadNotes(): Promise<void> {
    const noteDocuments = await this.dbService.gets<NoteDocument>();
    const notes = noteDocuments.filter(note => !note.deleted).map(this.toNote);
    this._notes.set(notes);
  }

  private parseTags(content?: string): string[] {
    if (!content) {
      return [];
    }

    const tagRegex = new RegExp('#(\\w|-|_)+', 'g');
    const tags = [...content.matchAll(tagRegex)];
    return tags.map(tag => tag[0]);
  }

  private toNote(document: NoteDocument): Note {
    return {
      id: document._id,
      rev: document._rev,
      title: document.title,
      content: document.content,
      metadata: {
        createdAt: new Date(document.createdAt),
        updatedAt: document.updatedAt
          ? new Date(document.updatedAt)
          : undefined,
        tags: document.tags,
      },
    };
  }

  private toDocument(note: Note): NoteDocument {
    return {
      _id: note.id,
      _rev: note.rev,
      title: note.title,
      content: note.content,
      createdAt: note.metadata.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
      tags: this.parseTags(note.content),
    };
  }
}
