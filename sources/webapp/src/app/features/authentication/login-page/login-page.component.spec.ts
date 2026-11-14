import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  profile,
  setupAuthenticationPageTest,
} from '../../../../testing/authentication-fixtures';
import { requiredElement } from '../../../../testing/note-fixtures';
import { of, Subject, throwError } from 'rxjs';
import { ApplicationUserDto } from '../../../core/server/api/generated/api-client';

describe('LoginPageComponent', () => {
  let page: ReturnType<typeof setupAuthenticationPageTest>;
  beforeEach(() => {
    page = setupAuthenticationPageTest();
  });
  it.each([true, false])(
    'shows the built-in form only when enabled (%s)',
    async enabled => {
      page.config.methods.set({
        builtInMethodResponse: { enabled, allowRegistration: true },
      });
      await page.render();
      expect(page.root.querySelector('form') !== null).toBe(enabled);
      expect(page.root.querySelector('a[href="/register"]') !== null).toBe(
        enabled
      );
      if (!enabled) expect(page.root.textContent).toContain('auth.noMethods');
    }
  );

  it('shows the OIDC placeholder after the form and registration link', async () => {
    page.config.methods.set({
      builtInMethodResponse: { enabled: true, allowRegistration: true },
      oidcMethodResponse: { enabled: true },
    });
    await page.render();
    const text = page.root.textContent ?? '';
    expect(text.indexOf('auth.oidcPending')).toBeGreaterThan(
      text.indexOf('auth.noAccount')
    );
    expect(page.root.querySelector('a[href*="oidc"]')).toBeNull();
  });

  it('offers a retry and keeps a link to local notes when methods are unavailable', async () => {
    page.config.failed.set(true);
    page.config.methods.set(undefined);
    await page.render();
    expect(page.root.textContent).toContain('auth.methodsUnavailable');
    expect(page.root.querySelector('a[href="/notes"]')).not.toBeNull();
    requiredElement<HTMLButtonElement>(page.root, 'button').click();
    expect(page.config.retry).toHaveBeenCalledOnce();
    expect(page.session.refresh).toHaveBeenCalledTimes(2);
  });

  it('validates credentials locally before calling the server', async () => {
    await page.render();
    page.fill('#auth-email', 'invalid');
    await page.submit();
    expect(page.root.textContent).toContain('auth.invalidEmail');
    expect(page.root.textContent).toContain('auth.passwordRequired');
    expect(page.session.login).not.toHaveBeenCalled();
  });

  it('disables the form during login, prevents duplicate requests and returns to notes on success', async () => {
    const response = new Subject<ApplicationUserDto>();
    page.session.login.mockReturnValue(response);
    await page.render();
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    page.fillCredentials();
    await page.submit();
    expect(
      requiredElement<HTMLFieldSetElement>(page.root, 'fieldset').disabled
    ).toBe(true);
    await page.submit();
    expect(page.session.login).toHaveBeenCalledOnce();
    expect(page.session.login).toHaveBeenCalledWith({
      email: profile.email,
      password: 'Example-password1!',
    });
    response.next(profile);
    response.complete();
    await page.harness.fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/notes'], {});
    expect(
      requiredElement<HTMLInputElement>(page.root, '#auth-password').value
    ).toBe('');
    navigate.mockRestore();
  });

  it('shows invalid credentials and preserves input for a retry', async () => {
    page.session.login.mockReturnValue(throwError(() => ({ status: 401 })));
    await page.render();
    page.fillCredentials();
    await page.submit();
    expect(page.root.querySelector('[role="alert"]')?.textContent).toContain(
      'auth.invalidCredentials'
    );
    expect(
      requiredElement<HTMLInputElement>(page.root, '#auth-email').value
    ).toBe(profile.email);
    expect(
      requiredElement<HTMLFieldSetElement>(page.root, 'fieldset').disabled
    ).toBe(false);
  });

  it('keeps notes accessible without a session or backend', async () => {
    page.session.status.set('unavailable');
    await page.render('/notes');
    expect(TestBed.inject(Router).url).toBe('/notes');
    expect(page.root.querySelector('app-nav-bar')).not.toBeNull();
    expect(page.root.querySelector('app-footer')).not.toBeNull();
  });

  it('returns to notes after login updates the session without redirecting to account', async () => {
    page.session.login.mockImplementation(() => {
      page.session.user.set(profile);
      page.session.status.set('authenticated');
      return of(profile);
    });
    await page.render('/login');
    page.fillCredentials();

    await page.submit();

    expect(TestBed.inject(Router).url).toBe('/notes');
  });
});
