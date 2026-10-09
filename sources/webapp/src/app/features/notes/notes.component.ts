
import { Component, ChangeDetectionStrategy, Signal, inject } from '@angular/core';
import { NoteService } from '../../data/notes/note.service';
import { Note } from '../../data/notes/note.model';
import { NoteQuickCreateComponent } from '../../shared/components/note-quick-create/note-quick-create.component';
import { NotePreviewComponent } from "../../shared/components/note-preview/note-preview.component";

@Component({
  selector: 'app-notes',
  imports: [NoteQuickCreateComponent, NotePreviewComponent],
  templateUrl: './notes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './notes.component.css'
})
export class NotesComponent {
  private readonly noteService = inject(NoteService);

  protected notes: Signal<Note[]> = this.noteService.notes;
}
