import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { NoteService } from '../../../../data/notes/note.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-note-quick-create',
  imports: [FormsModule],
  templateUrl: './note-quick-create.component.html',
  styleUrl: './note-quick-create.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoteQuickCreateComponent {
  private readonly noteService = inject(NoteService);

  protected noteContent = '';
  protected noteTitle = '';

  async saveNote(): Promise<void> {
    const title = this.noteTitle ?? this.noteContent.slice(0, 10) + "...";
    await this.noteService.createNote(title, this.noteContent);
  }
}
