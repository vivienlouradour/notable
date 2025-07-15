import { Component, Input, OnInit } from '@angular/core';
import { NoteService } from '../../core/note.service';
import { Note } from '../../shared/models/note.model';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { combineLatest, map, Observable, of, Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { NoteEditorComponent } from "../../shared/components/rich-text-editor/rich-text-editor.component";

@Component({
  selector: 'app-note',
  imports: [FormsModule, NgIf, NoteEditorComponent, NoteEditorComponent],
  templateUrl: './note.component.html',
  styleUrl: './note.component.css'
})
export class NoteComponent implements OnInit {
  private destroy$ = new Subject<void>();

  @Input() noteId!: string;
  protected note: Note | undefined;

  public constructor(
    private noteService: NoteService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    if (!this.noteId) {
      this.noteId = this.route.snapshot.paramMap.get('id') ?? '';
    }

    const routeId$ = this.route.paramMap.pipe(map(params => params.get('id')));
    const notes$ = this.noteService.notes$;
    combineLatest([routeId$, notes$])
      .pipe(map(([id, notes]) => notes.find(note => note.id === id)))
      .subscribe(note => {
        this.note = note;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateNote(): Observable<void> {
    debugger
    if (this.note) {
      return this.noteService.updateNote(this.noteId, this.note);
    }

    return of();
  }

  deleteNote() {
    if (this.note) {
      this.noteService.deleteNote(this.note.id, this.note.rev)
        .subscribe({
          complete: () => this.router.navigate(['/notes'])
        });
    }
  }
}
