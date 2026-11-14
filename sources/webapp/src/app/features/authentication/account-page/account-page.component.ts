import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { LucideLoaderCircle } from '@lucide/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { AuthenticationService } from '../../../core/server/authentication/authentication.service';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-account-page',
  imports: [AuthLayoutComponent, RouterLink, TranslatePipe, LucideLoaderCircle],
  templateUrl: './account-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPageComponent {
  protected readonly session = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly untilDestroyed = takeUntilDestroyed();
  protected readonly pending = signal(false);
  protected readonly error = signal('');

  constructor() {
    if (this.session.status() !== 'loading') this.session.refresh();
    effect(() => {
      if (!this.session.user() && this.session.status() === 'anonymous')
        void this.router.navigate(['/login']);
    });
  }

  protected logout(): void {
    if (this.pending()) return;
    this.error.set('');
    this.pending.set(true);
    this.session
      .logout()
      .pipe(
        this.untilDestroyed,
        finalize(() => this.pending.set(false))
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/login']);
        },
        error: () => this.error.set('auth.logoutFailed'),
      });
  }
}
