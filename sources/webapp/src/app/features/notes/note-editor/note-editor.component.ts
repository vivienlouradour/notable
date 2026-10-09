import { Component, ChangeDetectionStrategy, inject, Signal, computed } from '@angular/core';
import { NoteStore } from '../../../data/notes/note.store';
import { Note } from '../../../data/notes/note.model';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-note-editor',
  imports: [FormsModule],
  templateUrl: './note-editor.component.html',
  styleUrl: './note-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoteEditorComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly noteStore = inject(NoteStore);
  private readonly router = inject(Router);

  private readonly noteId: Signal<string | null> = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('id'))
    ),
    { initialValue: null }
  );

  protected readonly note: Signal<Note | undefined> = computed(() => {
    const noteId = this.noteId();

    if (!noteId) {
      return undefined;
    }

    return this.noteStore.notes().find(note => note.id === noteId);
  });

  async updateNote(): Promise<void> {
    const note = this.note();
    if (note) {
      await this.noteStore.updateNote(note, { title: note.title, content: note.content });
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
