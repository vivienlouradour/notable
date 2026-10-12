import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Note } from '../../../data/notes/note.model';
import { NoteStore } from '../../../data/notes/note.store';
import { makeNote } from '../../../../testing/note-fixtures';
import { FooterComponent } from './footer.component';
import { beforeEach, describe, expect, it } from 'vitest';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;
  const notes = signal<Note[]>([]);

  beforeEach(async () => {
    notes.set([]);
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [{ provide: NoteStore, useValue: { notes } }],
    }).compileComponents();
    fixture = TestBed.createComponent(FooterComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  it('shows the offline connection indicator and updates the document count from the store', async () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(
      root.querySelector('app-connection-status .status-error')
    ).not.toBeNull();
    expect(root.textContent).toContain('0 workspace.documentsCount');
    notes.set([makeNote(), makeNote({ id: 'note:second' })]);
    await fixture.whenStable();
    expect(root.textContent).toContain('2 workspace.documentsCount');
  });
});
