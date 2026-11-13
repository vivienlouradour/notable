import {
  LucideNotebook,
  LucideSearch,
  LucideSettings,
  LucideTag,
  LucideX,
} from '@lucide/angular';
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeSwitcherComponent } from '../../components/theme-switcher/theme-switcher.component';
import { LangSwitcherComponent } from '../../components/lang-switcher/lang-switcher.component';
import { SideBarComponent } from '../side-bar/side-bar.component';
import { AccountMenuComponent } from '../../components/account-menu/account-menu.component';

@Component({
  selector: 'app-nav-bar',
  imports: [
    RouterLink,
    TranslatePipe,
    LucideNotebook,
    LucideSearch,
    LucideSettings,
    LucideTag,
    LucideX,
    ThemeSwitcherComponent,
    LangSwitcherComponent,
    SideBarComponent,
    AccountMenuComponent,
  ],
  templateUrl: './nav-bar.component.html',
  host: { class: 'flex min-h-0 flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavBarComponent {
  protected appName = environment.appName;
  readonly sidebarOpen = signal(
    globalThis.matchMedia?.('(min-width: 761px)').matches ?? true
  );
  protected readonly settingsOpen = signal(false);
  protected readonly accountOpen = signal(false);

  protected toggleSettings(): void {
    this.accountOpen.set(false);
    this.settingsOpen.update(open => !open);
  }

  protected onAccountOpenChange(open: boolean): void {
    this.accountOpen.set(open);
    if (open) this.settingsOpen.set(false);
  }

  protected openSearch(input: HTMLInputElement): void {
    this.sidebarOpen.set(true);
    requestAnimationFrame(() => input.focus());
  }
}
