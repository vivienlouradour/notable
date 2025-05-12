import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NoteQuickCreateComponent } from "./shared/components/note-quick-create/note-quick-create.component";
import { NotesComponent } from "./features/notes/notes.component";
import { ThemeSwitcherComponent } from "./shared/components/theme-switcher/theme-switcher.component";
import { NavBarComponent } from "./shared/components/nav-bar/nav-bar.component";
import { TranslateService } from '@ngx-translate/core';
import { LangSwitcherComponent } from "./shared/components/lang-switcher/lang-switcher.component";
import { TagMenuItemComponent } from './shared/components/tag-menu-item/tag-menu-item.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavBarComponent, NoteQuickCreateComponent, NotesComponent, ThemeSwitcherComponent, NavBarComponent, LangSwitcherComponent, TagMenuItemComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'notable';

  constructor(private translate: TranslateService) {
    this.translate.addLangs(['fr', 'en']);
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }
}
