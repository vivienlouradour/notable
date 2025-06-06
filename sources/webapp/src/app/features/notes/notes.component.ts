import { NgFor } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NoteService } from '../../core/note.service';
import { Note } from '../../shared/models/note.model';
import { Subject, takeUntil } from 'rxjs';
import { NoteQuickCreateComponent } from '../../shared/components/note-quick-create/note-quick-create.component';
import { NotePreviewComponent } from "../../shared/components/note-preview/note-preview.component";

@Component({
  selector: 'app-notes',
  imports: [NgFor, NoteQuickCreateComponent, NotePreviewComponent],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.css'
})
export class NotesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  protected notes: Note[] = [];

  constructor(
    private noteService: NoteService
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
}
