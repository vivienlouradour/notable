import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NoteStore } from '../../../../data/notes/note.store';
import {
  makeNote,
  requiredElement,
} from '../../../../../testing/note-fixtures';
import { NotePreviewComponent } from './note-preview.component';

describe('NotePreviewComponent', () => {
  let fixture: ComponentFixture<NotePreviewComponent>;
  let root: HTMLElement;
  const deleteNote = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    deleteNote.mockClear();
    await TestBed.configureTestingModule({
      imports: [NotePreviewComponent],
      providers: [{ provide: NoteStore, useValue: { deleteNote } }],
    }).compileComponents();
    fixture = TestBed.createComponent(NotePreviewComponent);
    fixture.componentRef.setInput('note', makeNote());
    root = fixture.nativeElement;
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  it('renders the note title, content, creation date and editor link', () => {
    expect(requiredElement(root, 'strong').textContent).toBe('Test note');
    expect(root.textContent).toContain('Test content');
    expect(requiredElement(root, 'time').textContent).toContain('01 Jan 2026');
    expect(requiredElement(root, 'a').getAttribute('href')).toBe(
      '/notes/note:test'
    );
  });

  it('shows fallback labels for an empty title and content', async () => {
    fixture.componentRef.setInput('note', makeNote({ title: '', content: '' }));
    await fixture.whenStable();
    expect(root.textContent).toContain('notes.untitled');
    expect(root.textContent).toContain('notes.noContent');
  });

  it('deletes the current note when its delete button is clicked', () => {
    requiredElement<HTMLButtonElement>(root, 'button').click();
    expect(deleteNote).toHaveBeenCalledExactlyOnceWith(makeNote());
  });

  it('updates the preview and delete action when its input changes', async () => {
    const replacement = makeNote({ id: 'note:second', title: 'Second note' });
    fixture.componentRef.setInput('note', replacement);
    await fixture.whenStable();
    expect(requiredElement(root, 'strong').textContent).toBe('Second note');
    expect(requiredElement(root, 'a').getAttribute('href')).toBe(
      '/notes/note:second'
    );
    requiredElement<HTMLButtonElement>(root, 'button').click();
    expect(deleteNote).toHaveBeenCalledWith(replacement);
  });
});
