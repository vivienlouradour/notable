import { ComponentFixture, TestBed } from '@angular/core/testing';
import { requiredElement } from '../../../../testing/note-fixtures';
import { TagMenuItemComponent } from './tag-menu-item.component';
import { beforeEach, describe } from 'vitest';

describe('TagMenuItemComponent', () => {
  let fixture: ComponentFixture<TagMenuItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagMenuItemComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TagMenuItemComponent);
    fixture.componentRef.setInput('tagName', '#notable');
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  it('renders the supplied tag and updates it when its input changes', async () => {
    expect(requiredElement(fixture.nativeElement, 'span').textContent).toBe(
      '#notable'
    );
    fixture.componentRef.setInput('tagName', '#work');
    await fixture.whenStable();
    expect(requiredElement(fixture.nativeElement, 'span').textContent).toBe(
      '#work'
    );
  });
});
