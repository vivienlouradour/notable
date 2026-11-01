import { inject, Injectable, signal } from '@angular/core';
import { finalize, take, timeout } from 'rxjs';
import { injectLogger } from '../../logger/logger';
import {
  AuthClient,
  AuthenticationMethodsResponse,
} from '../api/generated/api-client';

@Injectable({ providedIn: 'root' })
export class AuthenticationConfigService {
  private readonly authClient = inject(AuthClient);
  private readonly logger = injectLogger('AuthenticationConfigService');
  private readonly _loading = signal(false);
  private readonly _failed = signal(false);
  private readonly _methods = signal<AuthenticationMethodsResponse | undefined>(
    undefined
  );
  public readonly loading = this._loading.asReadonly();
  public readonly failed = this._failed.asReadonly();
  public readonly methods = this._methods.asReadonly();

  constructor() {
    this.load();
  }

  public retry(): void {
    this.load();
  }

  private load(): void {
    if (this.loading()) {
      return;
    }

    this._loading.set(true);
    this._failed.set(false);

    // call api to get methods
    this.authClient
      .getMethods()
      .pipe(
        timeout(5_000),
        take(1),
        finalize(() => this._loading.set(false))
      )
      .subscribe({
        next: methods => {
          this._methods.set(methods);
        },
        error: error => {
          this.logger.warn('Failed to retrieve authentication methods', error);
          this._failed.set(true);
        },
      });
  }
}
