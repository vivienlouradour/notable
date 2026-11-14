import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { LangSwitcherComponent } from '../../../shared/components/lang-switcher/lang-switcher.component';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink, TranslatePipe, LucideArrowLeft, LangSwitcherComponent],
  templateUrl: './auth-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
  readonly titleKey = input.required<string>();
  readonly subtitleKey = input('auth.subtitle');
}
