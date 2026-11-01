import { LucidePlus } from '@lucide/angular';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NoteStore } from '../../../../data/notes/note.store';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-note-quick-create',
  imports: [FormsModule, TranslatePipe, LucidePlus],
  templateUrl: './note-quick-create.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteQuickCreateComponent {
  private readonly noteStore = inject(NoteStore);

  protected noteContent = '';
  protected noteTitle = '';

  async saveNote(): Promise<void> {
    await this.noteStore.createNote(this.noteTitle, this.noteContent);
    this.noteTitle = '';
    this.noteContent = '';
  }
}
