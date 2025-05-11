import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NoteComponent } from './features/note/note.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NoteComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'notable';
}
