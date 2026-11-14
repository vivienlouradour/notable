import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideLoaderCircle } from '@lucide/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { AuthenticationConfigService } from '../../../core/server/authentication/authentication-config.service';
import {
  AuthenticationService,
  hasStatus,
} from '../../../core/server/authentication/authentication.service';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';
import { ApiException } from '../../../core/server/api/generated/api-client';

@Component({
  selector: 'app-register-page',
  imports: [
    AuthLayoutComponent,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    LucideLoaderCircle,
  ],
  templateUrl: './register-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
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

  protected readonly validationErrors = signal<string[]>([]);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    confirmPassword: ['', Validators.required],
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
    this.validationErrors.set([]);
    this.form.markAllAsTouched();
    if (this.form.controls.confirmPassword.invalid)
      this.error.set('auth.passwordMismatch');
    if (this.form.invalid || !this.canRegister()) return;
    const { name, email, password, confirmPassword } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.error.set('auth.passwordMismatch');
      return;
    }
    this.pending.set(true);
    this.session
      .register({ email: email.trim(), password, userName: name.trim() })
      .pipe(
        this.untilDestroyed,
        finalize(() => this.pending.set(false))
      )
      .subscribe({
        next: () => {
          this.submitted = true;
          this.form.reset();
          void this.router.navigate(['/login'], {
            queryParams: { registered: 'true' },
          });
        },
        error: (error: unknown) => {
          this.error.set(
            hasStatus(error, 401)
              ? 'auth.invalidCredentials'
              : hasStatus(error, 403)
                ? 'auth.methodUnavailable'
                : 'auth.requestFailed'
          );
          if (error instanceof ApiException && error.status === 400) {
            this.error.set('auth.registrationFailed');
            this.validationErrors.set(
              this.readValidationErrors(error.response)
            );
          }
        },
      });
  }

  private readValidationErrors(response: string): string[] {
    try {
      const problem: unknown = JSON.parse(response);
      if (
        typeof problem !== 'object' ||
        problem === null ||
        !('errors' in problem) ||
        typeof problem.errors !== 'object' ||
        problem.errors === null
      )
        return [];
      return Object.values(problem.errors).flatMap((messages: unknown) =>
        Array.isArray(messages)
          ? messages.filter(
              (message: unknown): message is string =>
                typeof message === 'string'
            )
          : []
      );
    } catch {
      return [];
    }
  }
}
