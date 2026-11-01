import {
  LucideCheck,
  LucideChevronRight,
  LucideFileText,
  LucideNotebook,
  LucidePlus,
  LucideSearch,
  LucideTag,
} from '@lucide/angular';
import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  computed,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NoteStore } from '../../../data/notes/note.store';

@Component({
  selector: 'app-side-bar',
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    LucideCheck,
    LucideChevronRight,
    LucideFileText,
    LucideNotebook,
    LucidePlus,
    LucideSearch,
    LucideTag,
  ],
  templateUrl: './side-bar.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideBarComponent {
  private readonly noteStore = inject(NoteStore);

  readonly sidebarOpen = model.required<boolean>();
  readonly searchInput =
    viewChild.required<ElementRef<HTMLInputElement>>('searchInput');
  readonly tagsSection =
    viewChild.required<ElementRef<HTMLElement>>('tagsSection');

  protected readonly query = signal('');
  protected readonly filteredNotes = computed(() =>
    this.notes().filter(note =>
      note.title.toLocaleLowerCase().includes(this.query().toLocaleLowerCase())
    )
  );
  protected readonly notes = this.noteStore.notes;
  protected readonly tags = computed(() => [
    ...new Set(this.notes().flatMap(note => note.metadata?.tags ?? [])),
  ]);

  protected closeMobileSidebar(): void {
    if (globalThis.matchMedia?.('(max-width: 760px)').matches) {
      this.sidebarOpen.set(false);
    }
  }
}
