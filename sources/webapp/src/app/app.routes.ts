import { Routes } from '@angular/router';
import { NotesListComponent } from './features/notes/notes-list/notes-list.component';
import { NoteEditorComponent } from './features/notes/note-editor/note-editor.component';
import { AppLayoutComponent } from './shared/layout/workspace-layout/app-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/authentication/login-page/login-page.component').then(
        module => module.LoginPageComponent
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/authentication/register-page/register-page.component').then(
        module => module.RegisterPageComponent
      ),
  },
  {
    path: 'account',
    loadComponent: () =>
      import('./features/authentication/account-page/account-page.component').then(
        module => module.AccountPageComponent
      ),
  },
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
