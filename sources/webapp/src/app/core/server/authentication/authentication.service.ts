import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  defer,
  Observable,
  of,
  Subscription,
  switchMap,
  tap,
  throwError,
  timeout,
} from 'rxjs';
import {
  ApiException,
  ApplicationUserDto,
  AuthBuiltInClient,
  AuthClient,
  LoginRequest,
  RegisterRequest,
} from '../api/generated/api-client';

export type SessionStatus =
  'loading' | 'authenticated' | 'anonymous' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly client = inject(AuthClient);
  private readonly builtIn = inject(AuthBuiltInClient);
  private readonly destroyRef = inject(DestroyRef);
  private profileRequest?: Subscription;
  private readonly _user = signal<Readonly<ApplicationUserDto> | null>(null);
  private readonly _status = signal<SessionStatus>('loading');
  public readonly user = this._user.asReadonly();
  public readonly status = this._status.asReadonly();
  public readonly isAuthenticated = computed(
    () => this.status() === 'authenticated'
  );

  constructor() {
    this.refresh();
  }

  public refresh(): void {
    this.profileRequest?.unsubscribe();
    this._status.set('loading');
    this.profileRequest = this.client
      .me()
      .pipe(timeout(10_000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: user => this.setUser(user),
        error: (error: unknown) => {
          if (hasStatus(error, 401)) this.setUser(null);
          else this._status.set('unavailable');
        },
      });
  }

  public login(request: LoginRequest): Observable<ApplicationUserDto> {
    return defer(() => {
      this.profileRequest?.unsubscribe();
      return this.builtIn.login(request).pipe(
        timeout(10_000),
        switchMap(() => this.client.me().pipe(timeout(10_000))),
        tap({
          next: user => this.setUser(user),
          error: () => {
            if (this._status() === 'loading') this._status.set('unavailable');
          },
        })
      );
    });
  }

  public register(request: RegisterRequest): Observable<void> {
    return this.builtIn.register(request).pipe(
      timeout(10_000),
      // NSwag currently models only 200/204 although registration returns 201.
      catchError((error: unknown) =>
        error instanceof ApiException && error.status === 201
          ? of(void 0)
          : throwError(() => error)
      )
    );
  }

  public logout(): Observable<void> {
    return defer(() => {
      this.profileRequest?.unsubscribe();
      return this.client.logout().pipe(
        timeout(10_000),
        catchError((error: unknown) =>
          hasStatus(error, 401) ? of(void 0) : throwError(() => error)
        ),
        tap(() => this.setUser(null))
      );
    });
  }

  private setUser(user: ApplicationUserDto | null): void {
    this._user.set(user ? Object.freeze({ ...user }) : null);
    this._status.set(user ? 'authenticated' : 'anonymous');
  }
}

export function hasStatus(error: unknown, status: number): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === status
  );
}
