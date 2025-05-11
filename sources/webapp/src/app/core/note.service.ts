import { Injectable } from "@angular/core";
import { BehaviorSubject, from, Observable } from "rxjs";
import { Note, NoteBase } from "../shared/models/note.model";
import { environment } from '../../environments/environment';
import PouchDB from 'pouchdb';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private db: PouchDB.Database<NoteDocument>;
  private notesSubject = new BehaviorSubject<Note[]>([]);

  private databaseName = environment.localDbName;
  private couchDbUrl = environment.couchDbUrl;

  constructor() {
    this.db = new PouchDB(this.databaseName);
    this.syncWithCouch();
    this.loadInitialNotes();
    this.handleSyncChanges();
  }

  private mapToNote(noteDocument: NoteDocument): Note {
    return {
      id: noteDocument._id,
      rev: noteDocument._rev,
      title: noteDocument.title,
      content: noteDocument.content,
      metadata: {
        createdAt: new Date(noteDocument.createdAt),
        updatedAt: noteDocument.updatedAt ? new Date(noteDocument.updatedAt) : undefined
      }
    }
  }
  private syncWithCouch(): void {
    this.db.sync(`${this.couchDbUrl}/${this.databaseName}`, {
      live: true,
      retry: true
    }).on('change', info => {
      console.log('Sync change:', info);
    }).on('error', err => {
      console.error('Sync error:', err);
    });
  }

  private loadInitialNotes(): void {
    this.db.allDocs({ include_docs: true }).then(res => {
      const notes = res.rows.map(r => this.mapToNote(r.doc!));

      this.notesSubject.next(notes);
    });
  }

  private handleSyncChanges(): void {
    this.db.changes({
      since: 'now',
      live: true,
      include_docs: true
    }).on('change', change => {

      const current = this.notesSubject.value.slice();
      if (change.deleted) {
        this.notesSubject.next(current.filter(n => n.id !== change.id));
      } else {
        const idx = current.findIndex(n => n.id === change.id);
        const note = this.mapToNote(change.doc as NoteDocument);
        if (idx >= 0) {
          current[idx] = note;
        } else {
          current.push(note);
        }
        this.notesSubject.next(current);
      }
    });
  }

  public get notes$(): Observable<Note[]> {
    return this.notesSubject.asObservable();
  }

  public createNote(note: NoteBase): Observable<string> {
    const date = new Date().toISOString();
    const newNote = { ...note, _id: date, createdAt: date } as NoteDocument;

    var createdNoteId = this.db.put(newNote).then(response => response.id);

    return from(createdNoteId);
  }

  public updateNote(id: string, note: NoteBase): Observable<void> {
    const updatePromise = this.db.get(id).then(existingNote => {
      const updatedNote: NoteDocument = {
        ...existingNote,
        title: note.title,
        content: note.content,
        updatedAt: new Date().toISOString()
      };

      return this.db.put(updatedNote);
    }).then(() => { });

    return from(updatePromise);
  }

  public deleteNote(id: string, rev: string): Observable<void> {
    return from(this.db.remove(id, rev).then(() => { }));
  }
}

interface NoteDocument extends Omit<Note, 'id' | 'rev' | 'metadata'>, PouchDB.Core.IdMeta, PouchDB.Core.GetMeta {
  createdAt: string;
  updatedAt?: string;
}