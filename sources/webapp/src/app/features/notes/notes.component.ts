import { NgFor } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NoteService } from '../../core/note.service';
import { Note } from '../../shared/models/note.model';
import { Observable, Subject, takeUntil } from 'rxjs';
import { NoteQuickCreateComponent } from '../../shared/components/note-quick-create/note-quick-create.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notes',
  imports: [NgFor, NoteQuickCreateComponent],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.css'
})
export class NotesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  protected notes: Note[] = [];

  constructor(
    private noteService: NoteService,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.noteService
      .notes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notes => this.notes = notes);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  deleteNote(id: string, rev: string): Observable<void> {
    return this.noteService.deleteNote(id, rev);
  }

  updateNote(id: string) {
    this.router.navigate(['/notes', id]);
  }
}
