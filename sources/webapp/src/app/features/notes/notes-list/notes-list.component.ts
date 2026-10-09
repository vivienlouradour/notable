
import { Component, ChangeDetectionStrategy, Signal, inject } from '@angular/core';
import { NoteService } from '../../../data/notes/note.service';
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
  private readonly noteService = inject(NoteService);

  protected notes: Signal<Note[]> = this.noteService.notes;
}
