import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Note } from '../../../data/notes/note.model';
import { NoteStore } from '../../../data/notes/note.store';
import { makeNote, requiredElement } from '../../../../testing/note-fixtures';
import { SideBarComponent } from './side-bar.component';

describe('SideBarComponent', () => {
  let fixture: ComponentFixture<SideBarComponent>;
  let root: HTMLElement;
  const notes = signal<Note[]>([]);

  beforeEach(async () => {
    notes.set([]);
    await TestBed.configureTestingModule({
      imports: [SideBarComponent],
      providers: [{ provide: NoteStore, useValue: { notes } }],
    }).compileComponents();
    fixture = TestBed.createComponent(SideBarComponent);
    fixture.componentRef.setInput('sidebarOpen', true);
    root = fixture.nativeElement;
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function noteLinks() {
    return root.querySelectorAll<HTMLAnchorElement>('ul a');
  }

  it('shows empty document and tag states and links to the creation form', () => {
    expect(root.textContent).toContain('workspace.noDocuments');
    expect(root.textContent).toContain('workspace.noTags');
    expect(
      requiredElement(root, 'a[aria-label="notes.new"]').getAttribute('href')
    ).toBe('/notes#new-note');
  });

  it('renders the notes, unique tags and empty-title fallback', async () => {
    notes.set([
      makeNote({
        metadata: {
          createdAt: new Date('2026-01-01'),
          tags: ['#work', '#shared'],
        },
      }),
      makeNote({
        id: 'note:second',
        title: '',
        metadata: { createdAt: new Date('2026-01-01'), tags: ['#shared'] },
      }),
    ]);
    await fixture.whenStable();
    expect(noteLinks()).toHaveLength(2);
    expect(noteLinks()[1]?.textContent).toContain('notes.untitled');
    const section = requiredElement(root, 'section');
    const tags = Array.from(
      section.querySelectorAll('span'),
      element => element.textContent
    ).filter(text => text?.startsWith('#'));
    expect(tags).toHaveLength(2);
    expect(tags).toEqual(expect.arrayContaining(['#work', '#shared']));
    expect(section.textContent?.match(/#shared/g)).toHaveLength(1);
  });

  it('filters titles without case sensitivity and restores the list when search is cleared', async () => {
    notes.set([
      makeNote({ title: 'Meeting' }),
      makeNote({ id: 'note:second', title: 'Shopping', content: 'Meeting' }),
    ]);
    await fixture.whenStable();
    const search = requiredElement<HTMLInputElement>(
      root,
      'input[type="search"]'
    );
    search.value = 'MEET';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(noteLinks()).toHaveLength(1);
    expect(noteLinks()[0]?.textContent).toContain('Meeting');
    search.value = 'missing';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(root.textContent).toContain('workspace.noResults');
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(noteLinks()).toHaveLength(2);
  });

  it.each([true, false])(
    'closes the panel on note selection only when the viewport is mobile (%s)',
    async mobile => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: mobile }))
      );
      vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      notes.set([makeNote()]);
      await fixture.whenStable();
      const change = vi.fn();
      fixture.componentInstance.sidebarOpen.subscribe(change);
      requiredElement<HTMLAnchorElement>(root, 'ul a').click();
      await fixture.whenStable();
      expect(fixture.componentInstance.sidebarOpen()).toBe(!mobile);
      if (mobile) expect(change).toHaveBeenCalledWith(false);
      else expect(change).not.toHaveBeenCalled();
    }
  );
});
