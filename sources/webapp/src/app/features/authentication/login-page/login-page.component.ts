import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideLoaderCircle } from '@lucide/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { AuthenticationConfigService } from '../../../core/server/authentication/authentication-config.service';
import {
  AuthenticationService,
  hasStatus,
} from '../../../core/server/authentication/authentication.service';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-login-page',
  imports: [
    AuthLayoutComponent,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    LucideLoaderCircle,
  ],
  templateUrl: './login-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  protected readonly config = inject(AuthenticationConfigService);
  protected readonly session = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly untilDestroyed = takeUntilDestroyed();
  private submitted = false;
  protected readonly canRegister = computed(
    () =>
      this.config.methods()?.builtInMethodResponse?.enabled === true &&
      this.config.methods()?.builtInMethodResponse?.allowRegistration === true
  );
  protected readonly pending = signal(false);
  protected readonly error = signal('');

  private readonly route = inject(ActivatedRoute);
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly registered = computed(
    () => this.query().get('registered') === 'true'
  );
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    if (this.session.status() !== 'loading') this.session.refresh();
    effect(() => {
      if (this.session.user() && !this.submitted)
        void this.router.navigate(['/account']);
    });
  }

  protected submit(): void {
    if (this.pending()) return;
    this.error.set('');
    this.form.markAllAsTouched();
    if (
      this.form.invalid ||
      !this.config.methods()?.builtInMethodResponse?.enabled
    )
      return;
    const { email, password } = this.form.getRawValue();
    this.pending.set(true);
    this.session
      .login({ email: email.trim(), password })
      .pipe(
        this.untilDestroyed,
        finalize(() => this.pending.set(false))
      )
      .subscribe({
        next: () => {
          // The session update must not override the navigation to notes.
          this.submitted = true;
          this.form.reset();
          void this.router.navigate(['/notes'], {});
        },
        error: (error: unknown) =>
          this.error.set(
            hasStatus(error, 401)
              ? 'auth.invalidCredentials'
              : hasStatus(error, 403)
                ? 'auth.methodUnavailable'
                : 'auth.requestFailed'
          ),
      });
  }
}
