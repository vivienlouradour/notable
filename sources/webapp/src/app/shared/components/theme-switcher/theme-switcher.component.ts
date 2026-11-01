import { DOCUMENT } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { LucideSun, LucideMoon } from '@lucide/angular';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-theme-switcher',
  imports: [TranslatePipe, LucideSun, LucideMoon],
  templateUrl: './theme-switcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSwitcherComponent {
  private readonly document = inject(DOCUMENT);
  protected readonly dark = signal(false);

  constructor() {
    let savedTheme: string | null = null;
    try {
      savedTheme =
        this.document.defaultView?.localStorage.getItem('theme') ?? null;
    } catch {
      // The switch also works when browser storage is unavailable.
    }
    const prefersDark =
      this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)')
        .matches ?? false;
    this.setDark(
      savedTheme === 'dark' || (savedTheme !== 'light' && prefersDark)
    );
  }

  protected setDark(dark: boolean): void {
    const theme = dark ? 'dark' : 'light';
    this.dark.set(dark);
    this.document.documentElement.setAttribute('data-theme', theme);
    try {
      this.document.defaultView?.localStorage.setItem('theme', theme);
    } catch {
      // Applying the theme does not require persistent storage.
    }
  }
}
