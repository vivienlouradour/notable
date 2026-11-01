import {
  LucideCheck,
  LucideFileText,
  LucideNotebook,
  LucidePlus,
} from '@lucide/angular';
import {
  Component,
  ChangeDetectionStrategy,
  Signal,
  inject,
} from '@angular/core';
import { Note } from '../../../data/notes/note.model';
import { NoteQuickCreateComponent } from '../ui/note-quick-create/note-quick-create.component';
import { NotePreviewComponent } from '../ui/note-preview/note-preview.component';
import { NoteStore } from '../../../data/notes/note.store';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-notes-list',
  imports: [
    NoteQuickCreateComponent,
    NotePreviewComponent,
    TranslatePipe,
    LucideCheck,
    LucideFileText,
    LucideNotebook,
    LucidePlus,
  ],
  templateUrl: './notes-list.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesListComponent {
  private readonly noteStore = inject(NoteStore);

  protected notes: Signal<Note[]> = this.noteStore.notes;
}
