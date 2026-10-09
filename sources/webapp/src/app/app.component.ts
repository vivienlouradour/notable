import { Component, ChangeDetectionStrategy, inject, computed, Signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ThemeSwitcherComponent } from "./shared/components/theme-switcher/theme-switcher.component";
import { NavBarComponent } from "./shared/components/nav-bar/nav-bar.component";
import { TranslateService } from '@ngx-translate/core';
import { LangSwitcherComponent } from "./shared/components/lang-switcher/lang-switcher.component";
import { TagMenuItemComponent } from './shared/components/tag-menu-item/tag-menu-item.component';
import { NoteStore } from './data/notes/note.store';
import { Note } from './data/notes/note.model';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavBarComponent, ThemeSwitcherComponent, NavBarComponent, LangSwitcherComponent, TagMenuItemComponent, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'notable';
  private readonly noteStore = inject(NoteStore);
  private readonly translate = inject(TranslateService);

  protected notes: Signal<Note[]> = this.noteStore.notes;
  protected tags: Signal<string[]> = computed(() =>
    [
      ...new Set(this.notes().flatMap(note => note.metadata?.tags ?? []))
    ]);

  constructor() {
    this.translate.addLangs(['fr', 'en']);
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }
}
