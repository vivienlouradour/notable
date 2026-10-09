
import { Component, ChangeDetectionStrategy, Signal, inject } from '@angular/core';
import { NoteStore } from '../../../data/notes/note.store';
import { Note } from '../../../data/notes/note.model';
import { NoteQuickCreateComponent } from '../ui/note-quick-create/note-quick-create.component';
import { NotePreviewComponent } from "../ui/note-preview/note-preview.component";

@Component({
  selector: 'app-notes-list',
  imports: [NoteQuickCreateComponent, NotePreviewComponent],
  templateUrl: './notes-list.component.html',
  styleUrl: './notes-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotesListComponent {
  private readonly noteStore = inject(NoteStore);

  protected notes: Signal<Note[]> = this.noteStore.notes;
}
