import { Routes } from '@angular/router';
import { NotesListComponent } from './features/notes/notes-list/notes-list.component';
import { NoteEditorComponent } from './features/notes/note-editor/note-editor.component';

export const routes: Routes = [
  { path: 'notes', component: NotesListComponent },
  { path: 'notes/:id', component: NoteEditorComponent }
];
