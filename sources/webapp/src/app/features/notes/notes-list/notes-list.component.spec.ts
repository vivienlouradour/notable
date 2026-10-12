import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Note } from '../../../data/notes/note.model';
import { NoteStore } from '../../../data/notes/note.store';
import { makeNote } from '../../../../testing/note-fixtures';
import { NotesListComponent } from './notes-list.component';

describe('NotesListComponent', () => {
  let fixture: ComponentFixture<NotesListComponent>;
  let root: HTMLElement;
  const notes = signal<Note[]>([]);

  beforeEach(async () => {
    notes.set([]);
    await TestBed.configureTestingModule({
      imports: [NotesListComponent],
      providers: [
        {
          provide: NoteStore,
          useValue: { notes, createNote: vi.fn(), deleteNote: vi.fn() },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(NotesListComponent);
    root = fixture.nativeElement;
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  it('renders the empty library message and provides the creation form', () => {
    expect(root.textContent).toContain('notes.empty');
    expect(root.textContent).toContain('notes.emptyHint');
    expect(root.querySelector('app-note-quick-create form')).not.toBeNull();
    expect(root.querySelectorAll('app-note-preview')).toHaveLength(0);
  });

  it('renders each note and updates the list when the store changes', async () => {
    notes.set([
      makeNote(),
      makeNote({ id: 'note:second', title: 'Second note' }),
    ]);
    await fixture.whenStable();
    expect(root.querySelectorAll('app-note-preview')).toHaveLength(2);
    expect(root.textContent).toContain('Second note');
    expect(root.textContent).toContain('2 workspace.documentsCount');
    expect(root.textContent).not.toContain('notes.emptyHint');
    notes.set([]);
    await fixture.whenStable();
    expect(root.querySelectorAll('app-note-preview')).toHaveLength(0);
    expect(root.textContent).toContain('notes.emptyHint');
  });
});
