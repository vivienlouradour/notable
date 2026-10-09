import { Component, Input, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { Note } from '../../../../data/notes/note.model';

import { NoteStore } from '../../../../data/notes/note.store';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-note-preview',
  imports: [RouterLink],
  templateUrl: './note-preview.component.html',
  styleUrl: './note-preview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotePreviewComponent {
  private readonly noteStore = inject(NoteStore);
  protected readonly note = input.required<Note>();

  protected delete(): void {
    this.noteStore.deleteNote(this.note());
  }
}
