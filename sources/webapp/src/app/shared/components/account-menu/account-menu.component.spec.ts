import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApplicationUserDto,
  AuthBuiltInClient,
  AuthClient,
} from '../../../core/server/api/generated/api-client';
import { AuthenticationService } from '../../../core/server/authentication/authentication.service';
import { requiredElement } from '../../../../testing/note-fixtures';
import { AccountMenuComponent } from './account-menu.component';

describe('AccountMenuComponent', () => {
  const profile = {
    id: 'user-id',
    email: 'email@example.com',
    userName: 'vivien',
  };
  let fixture: ComponentFixture<AccountMenuComponent>;
  let root: HTMLElement;
  let client: {
    me: ReturnType<typeof vi.fn<() => Observable<ApplicationUserDto>>>;
    logout: ReturnType<typeof vi.fn<() => Observable<void>>>;
  };

  beforeEach(() => {
    client = {
      me: vi.fn(() => of(profile)),
      logout: vi.fn(() => of(void 0)),
    };
    TestBed.configureTestingModule({
      imports: [AccountMenuComponent],
      providers: [
        { provide: AuthClient, useValue: client },
        { provide: AuthBuiltInClient, useValue: {} },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  async function render() {
    fixture = TestBed.createComponent(AccountMenuComponent);
    root = fixture.nativeElement;
    fixture.autoDetectChanges();
    await fixture.whenStable();
  }

  function trigger() {
    return requiredElement<HTMLButtonElement>(root, ':scope > button');
  }

  async function openMenu() {
    trigger().click();
    await fixture.whenStable();
  }

  it.each([
    ['vivien', 'email@example.com', 'V'],
    ['  alice  ', 'email@example.com', 'A'],
    ['élise', 'email@example.com', 'É'],
    [undefined, 'email@example.com', 'E'],
    ['', 'email@example.com', 'E'],
    ['   ', '  email@example.com ', 'E'],
    [undefined, undefined, ''],
    ['', '   ', ''],
  ])(
    'displays the initial for username %s and email %s',
    async (userName, email, initial) => {
      client.me.mockReturnValue(of({ id: profile.id, userName, email }));
      await render();
      expect(trigger().textContent?.trim()).toBe(initial);
      expect(root.querySelector('svg[lucideCircleUserRound]') !== null).toBe(
        !initial
      );
      expect(trigger().getAttribute('aria-label')).toBe('auth.account');
    }
  );

  it('opens an icon-only account menu when both profile fields are null', async () => {
    // The server permits null fields although NSwag models them as optional strings.
    const nullableProfile = { id: profile.id, userName: null, email: null };
    client.me.mockReturnValue(
      of(nullableProfile as unknown as ApplicationUserDto)
    );
    await render();
    await openMenu();
    expect(root.querySelector('svg[lucideCircleUserRound]')).not.toBeNull();
    expect(root.querySelector('section')).not.toBeNull();
  });

  it('navigates to login when anonymous without opening a menu', async () => {
    client.me.mockReturnValue(throwError(() => ({ status: 401 })));
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    await render();
    await openMenu();
    expect(trigger().getAttribute('aria-label')).toBe('auth.login');
    expect(root.querySelector('svg[lucideCircleUserRound]')).not.toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(root.querySelector('section')).toBeNull();
  });

  it('disables the trigger until the initial session check completes', async () => {
    const request = new Subject<ApplicationUserDto>();
    client.me.mockReturnValue(request);
    fixture = TestBed.createComponent(AccountMenuComponent);
    root = fixture.nativeElement;
    fixture.autoDetectChanges();
    fixture.detectChanges();
    expect(trigger().disabled).toBe(true);
    expect(trigger().getAttribute('aria-busy')).toBe('true');
    request.next(profile);
    request.complete();
    await fixture.whenStable();
    expect(trigger().disabled).toBe(false);
    expect(trigger().textContent?.trim()).toBe('V');
  });

  it('allows login when the server is unavailable and no profile is known', async () => {
    client.me.mockReturnValue(throwError(() => ({ status: 0 })));
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    await render();
    expect(trigger().disabled).toBe(false);
    await openMenu();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('retains the initial and menu when a known profile cannot be refreshed', async () => {
    await render();
    const session = TestBed.inject(AuthenticationService);
    client.me.mockReturnValue(throwError(() => ({ status: 0 })));
    session.refresh();
    await fixture.whenStable();
    expect(session.status()).toBe('unavailable');
    expect(trigger().textContent?.trim()).toBe('V');
    await openMenu();
    expect(root.querySelector('section')).not.toBeNull();
  });

  it('toggles the panel without fetching the profile again', async () => {
    await render();
    await openMenu();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(requiredElement(root, 'section').id).toBe(
      trigger().getAttribute('aria-controls')
    );
    expect(root.querySelector('svg[lucideLogOut]')).not.toBeNull();
    await openMenu();
    expect(root.querySelector('section')).toBeNull();
    expect(client.me).toHaveBeenCalledOnce();
  });

  it('closes on outside click and Escape, restoring focus only for Escape', async () => {
    await render();
    await openMenu();
    document.body.click();
    await fixture.whenStable();
    expect(root.querySelector('section')).toBeNull();
    await openMenu();
    requiredElement<HTMLButtonElement>(root, 'section button').focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    await fixture.whenStable();
    expect(root.querySelector('section')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('keeps the menu open while tabbing inside and closes when focus leaves', async () => {
    await render();
    await openMenu();
    const logout = requiredElement<HTMLButtonElement>(root, 'section button');
    trigger().dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: logout })
    );
    await fixture.whenStable();
    expect(root.querySelector('section')).not.toBeNull();
    logout.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: document.body,
      })
    );
    await fixture.whenStable();
    expect(root.querySelector('section')).toBeNull();
  });

  it('logs out once, closes the menu and stays on the current route', async () => {
    const request = new Subject<void>();
    client.logout.mockReturnValue(request);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');
    const currentRoute = router.url;
    await render();
    await openMenu();
    const logout = requiredElement<HTMLButtonElement>(root, 'section button');
    logout.click();
    logout.click();
    fixture.detectChanges();
    expect(logout.getAttribute('aria-disabled')).toBe('true');
    expect(root.querySelector('.loading-spinner')).not.toBeNull();
    expect(client.logout).toHaveBeenCalledOnce();
    request.next();
    request.complete();
    await fixture.whenStable();
    expect(TestBed.inject(AuthenticationService).user()).toBeNull();
    expect(root.querySelector('section')).toBeNull();
    expect(root.querySelector('svg[lucideCircleUserRound]')).not.toBeNull();
    expect(router.url).toBe(currentRoute);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('retains the profile and displays a retryable logout error', async () => {
    client.logout.mockReturnValue(throwError(() => ({ status: 0 })));
    await render();
    await openMenu();
    requiredElement<HTMLButtonElement>(root, 'section button').click();
    await fixture.whenStable();
    expect(requiredElement(root, '[role="alert"]').textContent).toContain(
      'auth.logoutFailed'
    );
    expect(trigger().textContent?.trim()).toBe('V');
    expect(
      requiredElement(root, 'section button').getAttribute('aria-disabled')
    ).toBe('false');
    client.logout.mockReturnValue(of(void 0));
    requiredElement<HTMLButtonElement>(root, 'section button').click();
    await fixture.whenStable();
    expect(root.querySelector('section')).toBeNull();
  });

  it('closes the menu when the session expires', async () => {
    await render();
    await openMenu();
    client.me.mockReturnValue(throwError(() => ({ status: 401 })));
    TestBed.inject(AuthenticationService).refresh();
    await fixture.whenStable();
    expect(root.querySelector('section')).toBeNull();
    expect(trigger().getAttribute('aria-label')).toBe('auth.login');
  });

  it('cancels a pending logout when destroyed', async () => {
    const request = new Subject<void>();
    client.logout.mockReturnValue(request);
    await render();
    await openMenu();
    requiredElement<HTMLButtonElement>(root, 'section button').click();
    expect(request.observed).toBe(true);
    fixture.destroy();
    expect(request.observed).toBe(false);
  });
});
