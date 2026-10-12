import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requiredElement } from '../../../../testing/note-fixtures';
import { NavBarComponent } from './nav-bar.component';

describe('NavBarComponent', () => {
  let fixture: ComponentFixture<NavBarComponent>;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavBarComponent],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function render(desktop = true) {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: desktop }))
    );
    fixture = TestBed.createComponent(NavBarComponent);
    root = fixture.nativeElement;
    fixture.autoDetectChanges();
    await fixture.whenStable();
  }

  it.each([true, false])(
    'initializes the panel for a desktop viewport (%s)',
    async desktop => {
      await render(desktop);
      expect(fixture.componentInstance.sidebarOpen()).toBe(desktop);
      expect(
        requiredElement(
          root,
          'button[aria-controls="workspace-sidebar"]'
        ).getAttribute('aria-expanded')
      ).toBe(String(desktop));
    }
  );

  it('toggles the document panel and closes it using the overlay', async () => {
    await render(false);
    requiredElement<HTMLButtonElement>(
      root,
      'button[aria-controls="workspace-sidebar"]'
    ).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.sidebarOpen()).toBe(true);
    expect(
      requiredElement(root, '.drawer-overlay').getAttribute('tabindex')
    ).toBe('0');
    requiredElement<HTMLButtonElement>(root, '.drawer-overlay').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.sidebarOpen()).toBe(false);
    expect(
      requiredElement(root, '.drawer-overlay').getAttribute('tabindex')
    ).toBe('-1');
  });

  it('opens and closes the preferences panel', async () => {
    await render();
    const toggle = requiredElement<HTMLButtonElement>(
      root,
      'button[aria-controls="workspace-settings"]'
    );
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(
      requiredElement(root, '#workspace-settings').classList.contains('hidden')
    ).toBe(false);
    requiredElement<HTMLButtonElement>(
      root,
      '#workspace-settings button[aria-label="workspace.close"]'
    ).click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(
      requiredElement(root, '#workspace-settings').classList.contains('hidden')
    ).toBe(true);
  });

  it('opens the panel and focuses search on the next animation frame', async () => {
    await render(false);
    let nextFrame: FrameRequestCallback | undefined;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        nextFrame = callback;
        return 1;
      })
    );
    const input = requiredElement<HTMLInputElement>(
      root,
      'input[type="search"]'
    );
    const focus = vi.spyOn(input, 'focus');
    requiredElement<HTMLButtonElement>(
      root,
      'button[aria-label="workspace.search"]'
    ).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.sidebarOpen()).toBe(true);
    expect(focus).not.toHaveBeenCalled();
    if (!nextFrame) throw new Error('Search did not schedule focus');
    nextFrame(0);
    expect(focus).toHaveBeenCalledOnce();
  });

  it('opens the panel and scrolls to the tags section', async () => {
    await render(false);
    const section = requiredElement<HTMLElement>(root, 'app-side-bar section');
    const scrollIntoView = vi.fn();
    section.scrollIntoView = scrollIntoView;
    requiredElement<HTMLButtonElement>(
      root,
      'button[aria-label="workspace.tags"]'
    ).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.sidebarOpen()).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });
});
