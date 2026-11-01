import { Routes } from '@angular/router';
import { NotesListComponent } from './features/notes/notes-list/notes-list.component';
import { NoteEditorComponent } from './features/notes/note-editor/note-editor.component';
import { AppLayoutComponent } from './shared/layout/workspace-layout/app-layout.component';

export const routes: Routes = [
  ...['login', 'register', 'account'].map(path => ({
    path,
    loadComponent: () =>
      import('./features/authentication/authentication-page.component').then(
        module => module.AuthenticationPageComponent
      ),
    data: { registration: path === 'register' },
  })),
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'notes' },
      { path: 'notes', component: NotesListComponent },
      { path: 'notes/:id', component: NoteEditorComponent },
    ],
  },
];
