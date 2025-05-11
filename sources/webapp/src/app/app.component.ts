import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NoteQuickCreateComponent } from "./shared/components/note-quick-create/note-quick-create.component";
import { NotesComponent } from "./features/notes/notes.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NoteQuickCreateComponent, NotesComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'notable';
}
