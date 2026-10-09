import { inject, Injectable, signal } from "@angular/core";
import { Note } from "./note.model";
import { PouchDbService } from "../../core/persistence/pouchdb/pouchdb.service";

interface NoteDocument extends Omit<Note, 'id' | 'rev' | 'metadata'>, PouchDB.Core.IdMeta, PouchDB.Core.GetMeta {
  createdAt: string;
  updatedAt?: string;
  tags: string[];
}

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly dbService = inject(PouchDbService);
  private readonly noteDocumentIdentifier = "note";
  private readonly _notes = signal<Note[]>([]);

  public readonly notes = this._notes.asReadonly();

  constructor() {
    this.initialize();
  }

  public async get(id: string): Promise<Note> {
    const noteDocument = await this.dbService.get<NoteDocument>(id);
    return this.toNote(noteDocument);
  }

  public async createNote(title: string, content?: string): Promise<string> {
    const date = new Date().toISOString();
    const id = `${this.noteDocumentIdentifier}:${date}`;
    const tags = this.parseTags(content);
    const note = { title, content, _id: id, createdAt: date, tags } as NoteDocument;

    const resp = await this.dbService.put(note);
    return resp.id;
  }

  public async updateNote(note: Note, changes: Partial<Note>): Promise<Note> {
    const updated = {
      ...note,
      ...changes
    };

    const noteDocument = this.toDocument(updated);
    await this.dbService.put(noteDocument);

    return updated;
  }

  public async deleteNote(note: Note): Promise<void> {
    await this.dbService.remove({ _id: note.id, _rev: note.rev });
  }

  private async initialize(): Promise<void> {
    await this.loadNotes();
    this.listenToChanges();
  }

  private async loadNotes(): Promise<void> {
    var notes = await this.dbService
      .gets<NoteDocument>()
      .then(documents => documents.map(this.toNote));

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

  private listenToChanges(): void {
    this.dbService.changes<NoteDocument>().on('change', change => {
      // Change should concern Note type document
      if (!change.id.startsWith(this.noteDocumentIdentifier)) {
        return;
      }

      this._notes.update(current => {
        if (change.deleted) {
          return current.filter(note => note.id !== change.id);
        }

        const note = this.toNote(change.doc as NoteDocument);
        const index = current.findIndex(n => n.id === note.id);

        if (index >= 0) {
          return current.map((n, i) => i === index ? note : n);
        }

        return [...current, note];
      });
    });
  }

  private toNote(document: NoteDocument): Note {
    return {
      id: document._id,
      rev: document._rev,
      title: document.title,
      content: document.content,
      metadata: {
        createdAt: new Date(document.createdAt),
        updatedAt: document.updatedAt ? new Date(document.updatedAt) : undefined,
        tags: document.tags
      }
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
      tags: this.parseTags(note.content),
    };
  }
}
