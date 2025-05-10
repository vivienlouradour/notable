import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NoteComponent } from "./features/note/note.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NoteComponent],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'notable';
}
