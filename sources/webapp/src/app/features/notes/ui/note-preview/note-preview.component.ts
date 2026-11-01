import { LucideFileText, LucideTrash2 } from '@lucide/angular';
import {
  Component,
  ChangeDetectionStrategy,
  input,
  inject,
} from '@angular/core';
import { Note } from '../../../../data/notes/note.model';
import { RouterLink } from '@angular/router';
import { NoteStore } from '../../../../data/notes/note.store';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-note-preview',
  imports: [RouterLink, DatePipe, TranslatePipe, LucideFileText, LucideTrash2],
  templateUrl: './note-preview.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotePreviewComponent {
  private readonly noteStore = inject(NoteStore);
  public readonly note = input.required<Note>();

  protected delete(): void {
    this.noteStore.deleteNote(this.note());
  }
}
