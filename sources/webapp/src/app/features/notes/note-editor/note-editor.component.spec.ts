import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Note } from '../../../data/notes/note.model';
import { NoteStore } from '../../../data/notes/note.store';
import {
  deferred,
  makeNote,
  requiredElement,
} from '../../../../testing/note-fixtures';
import { NoteEditorComponent } from './note-editor.component';

describe('NoteEditorComponent', () => {
  let fixture: ComponentFixture<NoteEditorComponent>;
  let root: HTMLElement;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let notes: ReturnType<typeof signal<Note[]>>;
  let updateNote: ReturnType<
    typeof vi.fn<(note: Note, changes: Partial<Note>) => Promise<Note>>
  >;
  let deleteNote: ReturnType<typeof vi.fn<(note: Note) => Promise<void>>>;

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ id: 'note:test' }));
    notes = signal([makeNote()]);
    updateNote = vi
      .fn<(note: Note, changes: Partial<Note>) => Promise<Note>>()
      .mockResolvedValue(makeNote());
    deleteNote = vi
      .fn<(note: Note) => Promise<void>>()
      .mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [NoteEditorComponent],
      providers: [
        { provide: NoteStore, useValue: { notes, updateNote, deleteNote } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params.asObservable() },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(NoteEditorComponent);
    root = fixture.nativeElement;
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  it('loads the note selected by the route and renders its editable fields', () => {
    expect(
      requiredElement<HTMLTextAreaElement>(root, '[aria-label="notes.name"]')
        .value
    ).toBe('Test note');
    expect(
      requiredElement<HTMLTextAreaElement>(root, '[aria-label="notes.content"]')
        .value
    ).toBe('Test content');
    expect(root.textContent).toContain('12 notes.characters');
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('displays the unavailable state for an unknown id and performs no writes', async () => {
    params.next(convertToParamMap({ id: 'missing' }));
    await fixture.whenStable();
    expect(root.textContent).toContain('notes.unavailable');
    expect(root.querySelector('textarea')).toBeNull();
    await fixture.componentInstance.updateNote();
    await fixture.componentInstance.deleteNote();
    expect(updateNote).not.toHaveBeenCalled();
    expect(deleteNote).not.toHaveBeenCalled();
  });

  it('renders a note that arrives in the store after the route is selected', async () => {
    notes.set([]);
    await fixture.whenStable();
    expect(root.textContent).toContain('notes.unavailable');
    notes.set([makeNote()]);
    await fixture.whenStable();
    expect(root.querySelectorAll('textarea')).toHaveLength(2);
  });

  it('passes edited fields to the store and shows saved status only after success', async () => {
    const pending = deferred<Note>();
    updateNote.mockReturnValue(pending.promise);
    const title = requiredElement<HTMLTextAreaElement>(
      root,
      '[aria-label="notes.name"]'
    );
    title.value = 'Edited title';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    const content = requiredElement<HTMLTextAreaElement>(
      root,
      '[aria-label="notes.content"]'
    );
    content.value = 'Edited content';
    content.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(updateNote).not.toHaveBeenCalled();
    const saving = fixture.componentInstance.updateNote();
    expect(updateNote).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'note:test' }),
      { title: 'Edited title', content: 'Edited content' }
    );
    expect(root.querySelector('[role="status"]')).toBeNull();
    pending.resolve(makeNote());
    await saving;
    await fixture.whenStable();
    expect(requiredElement(root, '[role="status"]').textContent).toContain(
      'notes.saved'
    );
  });

  it('removes saved status when editing again or changing the selected note', async () => {
    await fixture.componentInstance.updateNote();
    await fixture.whenStable();
    const content = requiredElement<HTMLTextAreaElement>(
      root,
      '[aria-label="notes.content"]'
    );
    content.value = 'More text';
    content.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(root.querySelector('[role="status"]')).toBeNull();
    await fixture.componentInstance.updateNote();
    await fixture.whenStable();
    notes.set([...notes(), makeNote({ id: 'note:second', title: 'Second' })]);
    params.next(convertToParamMap({ id: 'note:second' }));
    await fixture.whenStable();
    expect(
      requiredElement<HTMLTextAreaElement>(root, '[aria-label="notes.name"]')
        .value
    ).toBe('Second');
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('does not display saved status after a failed write', async () => {
    const error = new Error('save failed');
    updateNote.mockRejectedValue(error);
    await expect(fixture.componentInstance.updateNote()).rejects.toBe(error);
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('navigates back to the library only after deletion succeeds', async () => {
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    const pending = deferred<void>();
    deleteNote.mockReturnValue(pending.promise);
    const deleting = fixture.componentInstance.deleteNote();
    expect(deleteNote).toHaveBeenCalledWith(makeNote());
    expect(navigate).not.toHaveBeenCalled();
    pending.resolve(undefined);
    await deleting;
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/notes']);
  });

  it('keeps the editor open after a failed deletion', async () => {
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    const error = new Error('delete failed');
    deleteNote.mockRejectedValue(error);
    await expect(fixture.componentInstance.deleteNote()).rejects.toBe(error);
    expect(navigate).not.toHaveBeenCalled();
    expect(root.querySelectorAll('textarea')).toHaveLength(2);
  });
});
