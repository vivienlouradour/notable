import { Component, Input } from '@angular/core';
import { Note } from '../../models/note.model';

import { NoteService } from '../../../core/note.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-note-preview',
  imports: [RouterLink],
  templateUrl: './note-preview.component.html',
  styleUrl: './note-preview.component.css'
})
export class NotePreviewComponent {
  @Input() note: Note;

  constructor(
    private noteService: NoteService
  ) { }

  protected delete(): void {
    this.noteService.deleteNote(this.note.id, this.note.rev);
  }
}
