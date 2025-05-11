import { Component } from '@angular/core';
import { NoteService } from '../../../core/note.service';
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-note-quick-create',
  imports: [FormsModule],
  templateUrl: './note-quick-create.component.html',
  styleUrl: './note-quick-create.component.css'
})
export class NoteQuickCreateComponent {
  protected noteContent = '';

  constructor(
    private noteService: NoteService
  ) { }

  saveNote(): Observable<string> {
    const title = this.noteContent.slice(0, 10) + "...";
    return this.noteService.createNote({ title, content: this.noteContent });
  }
}
