import { Component } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NoteService } from '../../../core/note.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-note-button',
  imports: [TranslatePipe],
  templateUrl: './create-note-button.component.html',
  styleUrl: './create-note-button.component.css'
})
export class CreateNoteButtonComponent {
  constructor(
    private translate: TranslateService,
    private router: Router,
    private noteService: NoteService) { }

  protected onClick() {
    this.noteService.createNote({
      title: this.translate.instant('notes.default-title'),
      content: ''
    }).subscribe(noteId => this.router.navigate(['/notes', noteId]));
  }
}
