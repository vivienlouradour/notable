import {
  LucideCalendarDays,
  LucideCheck,
  LucideFileText,
  LucideTrash2,
} from '@lucide/angular';
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  Signal,
  computed,
  signal,
  effect,
} from '@angular/core';
import { Note } from '../../../data/notes/note.model';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { NoteStore } from '../../../data/notes/note.store';

@Component({
  selector: 'app-note-editor',
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    TranslatePipe,
    LucideCalendarDays,
    LucideCheck,
    LucideFileText,
    LucideTrash2,
  ],
  templateUrl: './note-editor.component.html',
  host: { class: 'flex min-h-full flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteEditorComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly noteStore = inject(NoteStore);
  private readonly router = inject(Router);
  protected readonly saved = signal(false);

  private readonly noteId: Signal<string | null> = toSignal(
    this.route.paramMap.pipe(map(params => params.get('id'))),
    { initialValue: null }
  );

  protected readonly note: Signal<Note | undefined> = computed(() => {
    const noteId = this.noteId();

    if (!noteId) {
      return undefined;
    }

    return this.noteStore.notes().find(note => note.id === noteId);
  });

  constructor() {
    effect(() => {
      this.noteId();
      this.saved.set(false);
    });
  }

  async updateNote(): Promise<void> {
    const note = this.note();
    if (note) {
      await this.noteStore.updateNote(note, {
        title: note.title,
        content: note.content,
      });
      this.saved.set(true);
    }
  }

  async deleteNote(): Promise<void> {
    const note = this.note();
    if (note) {
      await this.noteStore.deleteNote(note);
      this.router.navigate(['/notes']);
    }
  }
}
