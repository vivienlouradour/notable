import { NgFor } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import PouchDB from 'pouchdb';

@Component({
  selector: 'app-note',
  imports: [FormsModule, NgFor],
  standalone: true,
  templateUrl: './note.component.html',
  styleUrl: './note.component.css'
})
export class NoteComponent implements OnInit {
  private db: PouchDB.Database;
  public noteContent = '';
  public notes: any[] = [];
  private changesFeed: PouchDB.Core.Changes<any> | undefined;

  constructor() {
    // Base locale PouchDB
    this.db = new PouchDB('notes-local');

    // Synchronisation automatique avec CouchDB
    this.db.sync('http://admin:admin@192.168.0.61:5984/notes-user123', {
      live: true,
      retry: true
    }).on('change', info => {
      console.log('Sync change:', info);
    }).on('error', err => {
      console.error('Sync error:', err);
    });
  }

  ngOnInit() {
    this.loadNotes();

    // Abonnement aux changements
    this.changesFeed = this.db.changes({
      since: 'now',
      live: true,
      include_docs: true,
    }).on('change', change => {
      console.log('Changement détecté :', change);
      this.loadNotes(); // recharge toutes les notes
    });
  }

  ngOnDestroy() {
    this.changesFeed?.cancel();
  }

  async saveNote() {
    const note = {
      _id: new Date().toISOString(),
      content: this.noteContent,
      createdAt: new Date().toISOString(),
    };

    try {
      await this.db.put(note);
      this.noteContent = '';
    } catch (err) {
      console.error('Erreur d\'enregistrement', err);
    }
  }

  async loadNotes() {
    try {
      const result = await this.db.allDocs({ include_docs: true, descending: true });
      this.notes = result.rows.map(row => row.doc);
    } catch (err) {
      console.error('Erreur de chargement', err);
    }
  }

}
