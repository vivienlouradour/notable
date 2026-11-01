import { ComponentFixture, TestBed } from '@angular/core/testing';
import { requiredElement } from '../../../../testing/note-fixtures';
import { ThemeSwitcherComponent } from './theme-switcher.component';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';

describe('ThemeSwitcherComponent', () => {
  let fixture: ComponentFixture<ThemeSwitcherComponent>;
  let toggle: HTMLInputElement;

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false }))
    );
    await TestBed.configureTestingModule({
      imports: [ThemeSwitcherComponent],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  async function render() {
    fixture = TestBed.createComponent(ThemeSwitcherComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    toggle = requiredElement<HTMLInputElement>(
      fixture.nativeElement,
      'input[role="switch"]'
    );
  }

  it('renders an accessible switch for dark mode with Lucide sun and moon icons', async () => {
    await render();
    expect(toggle.getAttribute('aria-label')).toBe('shared.theme.darkMode');
    expect(toggle.checked).toBe(false);
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(
      requiredElement(fixture.nativeElement, 'svg.lucide-sun').getAttribute(
        'aria-hidden'
      )
    ).toBe('true');
    expect(
      requiredElement(fixture.nativeElement, 'svg.lucide-moon').getAttribute(
        'aria-hidden'
      )
    ).toBe('true');
  });

  it.each(['light', 'dark'])(
    'restores the saved %s theme instead of the system preference',
    async theme => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: theme === 'light' }))
      );
      localStorage.setItem('theme', theme);
      await render();
      expect(document.documentElement.getAttribute('data-theme')).toBe(theme);
      expect(toggle.checked).toBe(theme === 'dark');
    }
  );

  it('switches both ways and persists the theme across component recreation', async () => {
    await render();
    toggle.click();
    await fixture.whenStable();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(fixture.nativeElement.textContent).toContain('shared.theme.dark');
    fixture.destroy();
    await render();
    expect(toggle.checked).toBe(true);
    toggle.click();
    await fixture.whenStable();
    expect(toggle.checked).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(fixture.nativeElement.textContent).toContain('shared.theme.light');
  });

  it.each([true, false])(
    'uses the system preference without a supported saved theme (dark: %s)',
    async prefersDark => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: prefersDark }))
      );
      await render();
      expect(toggle.checked).toBe(prefersDark);
      expect(document.documentElement.getAttribute('data-theme')).toBe(
        prefersDark ? 'dark' : 'light'
      );
    }
  );

  it('replaces an unsupported saved theme with a valid theme', async () => {
    localStorage.setItem('theme', 'retired-theme');
    document.documentElement.setAttribute('data-theme', 'retired-theme');
    await render();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(toggle.checked).toBe(false);
  });

  it('still switches themes when reading or writing browser storage fails', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    await render();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    toggle.click();
    await fixture.whenStable();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(toggle.checked).toBe(true);
  });
});
