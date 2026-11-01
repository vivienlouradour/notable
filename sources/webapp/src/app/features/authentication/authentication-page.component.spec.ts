import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../app.routes';
import {
  ApiException,
  ApplicationUserDto,
  AuthenticationMethodsResponse,
} from '../../core/server/api/generated/api-client';
import { AuthenticationConfigService } from '../../core/server/authentication/authentication-config.service';
import {
  AuthenticationService,
  SessionStatus,
} from '../../core/server/authentication/authentication.service';
import { requiredElement } from '../../../testing/note-fixtures';

describe('AuthenticationPageComponent', () => {
  const profile = { id: 'user-id', email: 'user@example.com' };
  let config: {
    methods: ReturnType<
      typeof signal<AuthenticationMethodsResponse | undefined>
    >;
    loading: ReturnType<typeof signal<boolean>>;
    failed: ReturnType<typeof signal<boolean>>;
    retry: ReturnType<typeof vi.fn>;
  };
  let session: {
    user: ReturnType<typeof signal<Readonly<ApplicationUserDto> | null>>;
    status: ReturnType<typeof signal<SessionStatus>>;
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
  };
  let harness: RouterTestingHarness;
  let root: HTMLElement;

  beforeEach(() => {
    config = {
      methods: signal<AuthenticationMethodsResponse | undefined>({
        builtInMethodResponse: { enabled: true, allowRegistration: true },
        oidcMethodResponse: { enabled: false },
      }),
      loading: signal(false),
      failed: signal(false),
      retry: vi.fn(),
    };
    session = {
      user: signal<Readonly<ApplicationUserDto> | null>(null),
      status: signal<SessionStatus>('anonymous'),
      login: vi.fn(() => of(profile)),
      register: vi.fn(() => of(void 0)),
      logout: vi.fn(() => of(void 0)),
      refresh: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthenticationConfigService, useValue: config },
        { provide: AuthenticationService, useValue: session },
      ],
    });
  });

  async function render(path = '/login') {
    harness = await RouterTestingHarness.create(path);
    harness.fixture.autoDetectChanges();
    await harness.fixture.whenStable();
    const element = harness.routeNativeElement;
    if (!element) throw new Error('Route did not render');
    root = element;
  }

  function fill(selector: string, value: string) {
    const input = requiredElement<HTMLInputElement>(root, selector);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function submit() {
    requiredElement<HTMLFormElement>(root, 'form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    await harness.fixture.whenStable();
  }

  function fillCredentials() {
    fill('#auth-email', profile.email);
    fill('#auth-password', 'Example-password1!');
  }

  it.each([true, false])(
    'shows the built-in form only when enabled (%s)',
    async enabled => {
      config.methods.set({
        builtInMethodResponse: { enabled, allowRegistration: true },
      });
      await render();
      expect(root.querySelector('form') !== null).toBe(enabled);
      expect(root.querySelector('a[href="/register"]') !== null).toBe(enabled);
      if (!enabled) expect(root.textContent).toContain('auth.noMethods');
    }
  );

  it('hides registration when disabled and prevents accessing the form directly', async () => {
    config.methods.set({
      builtInMethodResponse: { enabled: true, allowRegistration: false },
    });
    await render();
    expect(root.querySelector('a[href="/register"]')).toBeNull();
    await harness.navigateByUrl('/register');
    expect(harness.routeNativeElement?.querySelector('form')).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain(
      'auth.registrationDisabled'
    );
  });

  it('shows the OIDC placeholder after the form and registration link', async () => {
    config.methods.set({
      builtInMethodResponse: { enabled: true, allowRegistration: true },
      oidcMethodResponse: { enabled: true },
    });
    await render();
    const text = root.textContent ?? '';
    expect(text.indexOf('auth.oidcPending')).toBeGreaterThan(
      text.indexOf('auth.noAccount')
    );
    expect(root.querySelector('a[href*="oidc"]')).toBeNull();
  });

  it('offers a retry and keeps a link to local notes when methods are unavailable', async () => {
    config.failed.set(true);
    config.methods.set(undefined);
    await render();
    expect(root.textContent).toContain('auth.methodsUnavailable');
    expect(root.querySelector('a[href="/notes"]')).not.toBeNull();
    requiredElement<HTMLButtonElement>(root, 'button').click();
    expect(config.retry).toHaveBeenCalledOnce();
    expect(session.refresh).toHaveBeenCalledTimes(2);
  });

  it('validates credentials locally before calling the server', async () => {
    await render();
    fill('#auth-email', 'invalid');
    await submit();
    expect(root.textContent).toContain('auth.invalidEmail');
    expect(root.textContent).toContain('auth.passwordRequired');
    expect(session.login).not.toHaveBeenCalled();
  });

  it('disables the form during login, prevents duplicate requests and returns to notes on success', async () => {
    const response = new Subject<ApplicationUserDto>();
    session.login.mockReturnValue(response);
    await render();
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    fillCredentials();
    await submit();
    expect(
      requiredElement<HTMLFieldSetElement>(root, 'fieldset').disabled
    ).toBe(true);
    await submit();
    expect(session.login).toHaveBeenCalledOnce();
    response.next(profile);
    response.complete();
    await harness.fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/notes'], {});
    expect(
      requiredElement<HTMLInputElement>(root, '#auth-password').value
    ).toBe('');
    navigate.mockRestore();
  });

  it('shows invalid credentials and preserves input for a retry', async () => {
    session.login.mockReturnValue(throwError(() => ({ status: 401 })));
    await render();
    fillCredentials();
    await submit();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'auth.invalidCredentials'
    );
    expect(requiredElement<HTMLInputElement>(root, '#auth-email').value).toBe(
      profile.email
    );
    expect(
      requiredElement<HTMLFieldSetElement>(root, 'fieldset').disabled
    ).toBe(false);
  });

  it('requires matching passwords at registration', async () => {
    await render('/register');
    fillCredentials();
    fill('#auth-confirm-password', 'Different-password1!');
    await submit();
    expect(root.textContent).toContain('auth.passwordMismatch');
    expect(session.register).not.toHaveBeenCalled();
  });

  it('returns to login with a success message after registration', async () => {
    await render('/register');
    fillCredentials();
    fill('#auth-confirm-password', 'Example-password1!');
    await submit();
    expect(session.register).toHaveBeenCalledWith({
      email: profile.email,
      password: 'Example-password1!',
    });
    expect(session.login).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/login?registered=true');
    expect(harness.routeNativeElement?.textContent).toContain(
      'auth.registered'
    );
  });

  it('shows server validation errors as text and tolerates malformed responses', async () => {
    session.register.mockReturnValue(
      throwError(
        () =>
          new ApiException(
            'Validation',
            400,
            JSON.stringify({
              errors: {
                PasswordTooShort: ['<b>Too short</b>'],
                invalid: [null, 1],
              },
            }),
            {},
            null
          )
      )
    );
    await render('/register');
    fillCredentials();
    fill('#auth-confirm-password', 'Example-password1!');
    await submit();
    expect(root.querySelector('[role="alert"] li')?.textContent).toBe(
      '<b>Too short</b>'
    );
    expect(root.querySelector('[role="alert"] b')).toBeNull();
    session.register.mockReturnValue(
      throwError(
        () => new ApiException('Validation', 400, 'not-json', {}, null)
      )
    );
    await submit();
    expect(root.textContent).toContain('auth.registrationFailed');
  });

  it('shows a read-only profile and lets the user sign out', async () => {
    session.user.set(profile);
    session.status.set('authenticated');
    await render('/account');
    expect(root.querySelector('dl')?.textContent).toContain(profile.email);
    expect(root.querySelector('dl')?.textContent).toContain(profile.id);
    expect(root.querySelector('input')).toBeNull();
    requiredElement<HTMLButtonElement>(root, 'button').click();
    await harness.fixture.whenStable();
    expect(session.logout).toHaveBeenCalledOnce();
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('keeps notes accessible without a session or backend', async () => {
    session.status.set('unavailable');
    await render('/notes');
    expect(TestBed.inject(Router).url).toBe('/notes');
    expect(root.querySelector('app-nav-bar')).not.toBeNull();
    expect(root.querySelector('app-footer')).not.toBeNull();
  });
});
