import { Component, Input, OnInit } from '@angular/core';
import { NoteService } from '../../core/note.service';
import { Note } from '../../shared/models/note.model';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { combineLatest, map, Observable, of, Subject, takeUntil } from 'rxjs';
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

    const routeId$ = this.route.paramMap.pipe(map(params => params.get('id')));
    const notes$ = this.noteService.notes$;
    combineLatest([routeId$, notes$])
      .pipe(map(([id, notes]) => notes.find(note => note.id === this.noteId)))
      .subscribe(note => this.note = note);
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
