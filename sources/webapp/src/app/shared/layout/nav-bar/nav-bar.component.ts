import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '../../components/icon/icon.component';
import { ThemeSwitcherComponent } from '../../components/theme-switcher/theme-switcher.component';
import { LangSwitcherComponent } from '../../components/lang-switcher/lang-switcher.component';
import { SideBarComponent } from '../side-bar/side-bar.component';

@Component({
  selector: 'app-nav-bar',
  imports: [
    RouterLink,
    TranslatePipe,
    IconComponent,
    ThemeSwitcherComponent,
    LangSwitcherComponent,
    SideBarComponent,
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

  protected openSearch(input: HTMLInputElement): void {
    this.sidebarOpen.set(true);
    requestAnimationFrame(() => input.focus());
  }
}
