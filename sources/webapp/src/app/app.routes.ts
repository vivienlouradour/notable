import { Routes } from '@angular/router';
import { NotesComponent } from './features/notes/notes.component';
import { NoteComponent } from './features/note/note.component';

export const routes: Routes = [
  { path: 'notes', component: NotesComponent },
  { path: 'notes/:id', component: NoteComponent }
];
