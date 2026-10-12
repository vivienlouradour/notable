import { ComponentFixture, TestBed } from '@angular/core/testing';
import { requiredElement } from '../../../../testing/note-fixtures';
import { ThemeSwitcherComponent } from './theme-switcher.component';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';

describe('ThemeSwitcherComponent', () => {
  let fixture: ComponentFixture<ThemeSwitcherComponent>;
  let select: HTMLSelectElement;

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    await TestBed.configureTestingModule({
      imports: [ThemeSwitcherComponent],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  async function render() {
    fixture = TestBed.createComponent(ThemeSwitcherComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    select = requiredElement<HTMLSelectElement>(
      fixture.nativeElement,
      'select'
    );
  }

  it('offers the three supported themes with an accessible label', async () => {
    await render();
    expect(Array.from(select.options, option => option.value)).toEqual([
      'light',
      'dark',
      'cupcake',
    ]);
    expect(select.getAttribute('aria-label')).toBe('workspace.appearance');
  });

  it.each(['light', 'dark', 'cupcake'])(
    'applies and persists the %s theme selected by the user',
    async theme => {
      await render();
      select.value = theme;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
      expect(localStorage.getItem('theme')).toBe(theme);
    }
  );

  it('restores a previously saved theme when the component is initialized', async () => {
    localStorage.setItem('theme', 'dark');
    await render();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(select.value).toBe('dark');
  });
});
