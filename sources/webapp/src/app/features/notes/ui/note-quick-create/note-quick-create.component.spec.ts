import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NoteStore } from '../../../../data/notes/note.store';
import {
  deferred,
  requiredElement,
} from '../../../../../testing/note-fixtures';
import { NoteQuickCreateComponent } from './note-quick-create.component';

describe('NoteQuickCreateComponent', () => {
  let fixture: ComponentFixture<NoteQuickCreateComponent>;
  let root: HTMLElement;
  let createNote: ReturnType<
    typeof vi.fn<(title: string, content: string) => Promise<string>>
  >;

  beforeEach(async () => {
    createNote = vi
      .fn<(title: string, content: string) => Promise<string>>()
      .mockResolvedValue('note:new');
    await TestBed.configureTestingModule({
      imports: [NoteQuickCreateComponent],
      providers: [{ provide: NoteStore, useValue: { createNote } }],
    }).compileComponents();
    fixture = TestBed.createComponent(NoteQuickCreateComponent);
    root = fixture.nativeElement;
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  async function fill(title: string, content: string) {
    const titleInput = requiredElement<HTMLInputElement>(
      root,
      'input[name="title"]'
    );
    const contentInput = requiredElement<HTMLTextAreaElement>(root, 'textarea');
    titleInput.value = title;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    contentInput.value = content;
    contentInput.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  it('saves the entered title and content on form submission and clears both fields', async () => {
    await fill('Meeting', 'Meeting notes');
    requiredElement<HTMLFormElement>(root, 'form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    await fixture.whenStable();
    expect(createNote).toHaveBeenCalledExactlyOnceWith(
      'Meeting',
      'Meeting notes'
    );
    expect(
      requiredElement<HTMLInputElement>(root, 'input[name="title"]').value
    ).toBe('');
    expect(requiredElement<HTMLTextAreaElement>(root, 'textarea').value).toBe(
      ''
    );
  });

  it('preserves a deliberately empty title instead of generating one from the content', async () => {
    await fill('', 'A note without a title');
    await fixture.componentInstance.saveNote();
    expect(createNote).toHaveBeenCalledExactlyOnceWith(
      '',
      'A note without a title'
    );
  });

  it('retains the entered values until the save succeeds', async () => {
    const pending = deferred<string>();
    createNote.mockReturnValue(pending.promise);
    await fill('Pending', 'Unsaved content');
    const save = fixture.componentInstance.saveNote();
    expect(requiredElement<HTMLInputElement>(root, 'input').value).toBe(
      'Pending'
    );
    expect(requiredElement<HTMLTextAreaElement>(root, 'textarea').value).toBe(
      'Unsaved content'
    );
    pending.resolve('note:new');
    await save;
  });

  it('retains the entered values after a failed save', async () => {
    const error = new Error('local write failed');
    createNote.mockRejectedValue(error);
    await fill('Keep this', 'Important content');
    await expect(fixture.componentInstance.saveNote()).rejects.toBe(error);
    expect(requiredElement<HTMLInputElement>(root, 'input').value).toBe(
      'Keep this'
    );
    expect(requiredElement<HTMLTextAreaElement>(root, 'textarea').value).toBe(
      'Important content'
    );
  });
});
