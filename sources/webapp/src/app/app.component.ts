import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NoteQuickCreateComponent } from "./shared/components/note-quick-create/note-quick-create.component";
import { NotesComponent } from "./features/notes/notes.component";
import { ThemeSwitcherComponent } from "./shared/components/theme-switcher/theme-switcher.component";
import { NavBarComponent } from "./shared/components/nav-bar/nav-bar.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavBarComponent, NoteQuickCreateComponent, NotesComponent, ThemeSwitcherComponent, NavBarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'notable';
}
