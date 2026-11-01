import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideLoaderCircle } from '@lucide/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, Observable } from 'rxjs';
import { AuthenticationConfigService } from '../../core/server/authentication/authentication-config.service';
import {
  AuthenticationService,
  hasStatus,
} from '../../core/server/authentication/authentication.service';
import { ApiException } from '../../core/server/api/generated/api-client';
import { LangSwitcherComponent } from '../../shared/components/lang-switcher/lang-switcher.component';

@Component({
  selector: 'app-authentication-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    LucideArrowLeft,
    LucideLoaderCircle,
    LangSwitcherComponent,
  ],
  templateUrl: './authentication-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthenticationPageComponent {
  protected readonly config = inject(AuthenticationConfigService);
  protected readonly session = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly registration = computed(
    () => this.routeData()['registration'] === true
  );
  protected readonly registered = computed(
    () => !this.registration() && this.query().get('registered') === 'true'
  );
  protected readonly canRegister = computed(
    () =>
      this.config.methods()?.builtInMethodResponse?.enabled === true &&
      this.config.methods()?.builtInMethodResponse?.allowRegistration === true
  );
  protected readonly pending = signal(false);
  protected readonly error = signal('');
  protected readonly validationErrors = signal<string[]>([]);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    confirmPassword: [''],
  });
  private readonly untilDestroyed = takeUntilDestroyed();

  constructor() {
    if (this.session.status() !== 'loading') this.session.refresh();
  }

  protected submit(): void {
    if (this.pending()) return;
    this.error.set('');
    this.validationErrors.set([]);
    this.form.markAllAsTouched();
    if (this.registration() && this.form.controls.confirmPassword.invalid) {
      this.error.set('auth.passwordMismatch');
    }
    if (this.form.invalid) return;
    if (this.registration() && !this.canRegister()) return;
    if (!this.config.methods()?.builtInMethodResponse?.enabled) return;
    const { email, password, confirmPassword } = this.form.getRawValue();
    if (this.registration() && password !== confirmPassword) {
      this.error.set('auth.passwordMismatch');
      return;
    }
    this.pending.set(true);
    const operation: Observable<unknown> = this.registration()
      ? this.session.register({ email: email.trim(), password })
      : this.session.login({ email: email.trim(), password });
    operation
      .pipe(
        this.untilDestroyed,
        finalize(() => this.pending.set(false))
      )
      .subscribe({
        next: () => {
          this.form.reset();
          void this.router.navigate(
            this.registration() ? ['/login'] : ['/notes'],
            this.registration() ? { queryParams: { registered: 'true' } } : {}
          );
        },
        error: (error: unknown) => {
          this.error.set(
            hasStatus(error, 401)
              ? 'auth.invalidCredentials'
              : hasStatus(error, 403)
                ? 'auth.methodUnavailable'
                : 'auth.requestFailed'
          );
          if (
            this.registration() &&
            error instanceof ApiException &&
            error.status === 400
          ) {
            this.error.set('auth.registrationFailed');
            this.validationErrors.set(
              this.readValidationErrors(error.response)
            );
          }
        },
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
