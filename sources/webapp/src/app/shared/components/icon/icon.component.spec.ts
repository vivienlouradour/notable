import { ComponentFixture, TestBed } from '@angular/core/testing';
import { requiredElement } from '../../../../testing/note-fixtures';
import { IconComponent } from './icon.component';
import { describe, beforeEach, it, expect } from 'vitest';

describe('IconComponent', () => {
  let fixture: ComponentFixture<IconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(IconComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  it('renders a decorative SVG and changes its shape when the icon name changes', async () => {
    const svg = requiredElement(fixture.nativeElement, 'svg');
    const path = requiredElement(fixture.nativeElement, 'path');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    const initial = path.getAttribute('d');
    expect(initial).toBeTruthy();
    fixture.componentRef.setInput('name', 'trash');
    await fixture.whenStable();
    expect(path.getAttribute('d')).toBeTruthy();
    expect(path.getAttribute('d')).not.toBe(initial);
  });
});
