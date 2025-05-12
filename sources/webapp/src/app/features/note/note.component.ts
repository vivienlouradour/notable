import { Component, Input, OnInit } from '@angular/core';
import { NoteService } from '../../core/note.service';
import { Note } from '../../shared/models/note.model';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Observable, of, Subject, takeUntil } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-note',
  imports: [FormsModule, NgIf],
  templateUrl: './note.component.html',
  styleUrl: './note.component.css'
})
export class NoteComponent implements OnInit {
  private destroy$ = new Subject<void>();

  @Input() noteId!: string;
  protected note: Note | undefined;

  public constructor(
    private noteService: NoteService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    if (!this.noteId) {
      this.noteId = this.route.snapshot.paramMap.get('id') ?? '';
    }

    this.noteService
      .notes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notes => {
        const note = notes.find(note => note.id === this.noteId);

        if (note) {
          this.note = note;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateNote(): Observable<void> {
    if (this.note) {
      return this.noteService.updateNote(this.noteId, this.note);
    }

    return of();
  }
}
