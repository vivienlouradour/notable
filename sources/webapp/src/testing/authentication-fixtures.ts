import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { routes } from '../app/app.routes';
import {
  ApplicationUserDto,
  AuthenticationMethodsResponse,
} from '../app/core/server/api/generated/api-client';
import { AuthenticationConfigService } from '../app/core/server/authentication/authentication-config.service';
import {
  AuthenticationService,
  SessionStatus,
} from '../app/core/server/authentication/authentication.service';
import { requiredElement } from './note-fixtures';

export const profile = { id: 'user-id', email: 'user@example.com' };

export function setupAuthenticationPageTest() {
  let harness: RouterTestingHarness;
  let root: HTMLElement;

  const config = {
    methods: signal<AuthenticationMethodsResponse | undefined>({
      builtInMethodResponse: { enabled: true, allowRegistration: true },
      oidcMethodResponse: { enabled: false },
    }),
    loading: signal(false),
    failed: signal(false),
    retry: vi.fn(),
  };
  const session: {
    user: ReturnType<typeof signal<Readonly<ApplicationUserDto> | null>>;
    status: ReturnType<typeof signal<SessionStatus>>;
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
  } = {
    user: signal<Readonly<ApplicationUserDto> | null>(null),
    status: signal<SessionStatus>('anonymous'),
    login: vi.fn(() => of(profile)),
    register: vi.fn(() => of(void 0)),
    logout: vi.fn(() => {
      session.user.set(null);
      session.status.set('anonymous');
      return of(void 0);
    }),
    refresh: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      { provide: AuthenticationConfigService, useValue: config },
      { provide: AuthenticationService, useValue: session },
    ],
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

  function fillRegistration(name = 'Example User') {
    fillCredentials();
    fill('#auth-name', name);
    fill('#auth-confirm-password', 'Example-password1!');
  }

  return {
    config,
    session,
    render,
    fill,
    submit,
    fillCredentials,
    fillRegistration,
    get root() {
      return root;
    },
    get harness() {
      return harness;
    },
  };
}
