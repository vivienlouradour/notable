import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NoteStore } from '../../../../data/notes/note.store';

@Component({
  selector: 'app-note-quick-create',
  imports: [FormsModule],
  templateUrl: './note-quick-create.component.html',
  styleUrl: './note-quick-create.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoteQuickCreateComponent {
  private readonly noteStore = inject(NoteStore);

  protected noteContent = '';
  protected noteTitle = '';

  async saveNote(): Promise<void> {
    const title = this.noteTitle ?? this.noteContent.slice(0, 10) + "...";
    await this.noteStore.createNote(title, this.noteContent);
  }
}
