import { Component, Input, ChangeDetectionStrategy, input } from '@angular/core';
import { Note } from '../../../../data/notes/note.model';

import { NoteService } from '../../../../data/notes/note.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-note-preview',
  imports: [RouterLink],
  templateUrl: './note-preview.component.html',
  styleUrl: './note-preview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotePreviewComponent {
  readonly note = input.required<Note>();

  constructor(
    private noteService: NoteService
  ) { }

  protected delete(): void {
    this.noteService.deleteNote(this.note());
  }
}
