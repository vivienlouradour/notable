import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NoteStore } from '../../../../data/notes/note.store';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-note-quick-create',
  imports: [FormsModule, TranslatePipe, IconComponent],
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
