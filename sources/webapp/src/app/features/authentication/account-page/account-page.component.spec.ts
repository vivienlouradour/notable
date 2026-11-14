import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  profile,
  setupAuthenticationPageTest,
} from '../../../../testing/authentication-fixtures';
import { requiredElement } from '../../../../testing/note-fixtures';
import { Subject, throwError } from 'rxjs';
import { AuthenticationConfigService } from '../../../core/server/authentication/authentication-config.service';

describe('AccountPageComponent', () => {
  let page: ReturnType<typeof setupAuthenticationPageTest>;
  beforeEach(() => {
    page = setupAuthenticationPageTest();
  });
  it('shows a read-only profile and lets the user sign out', async () => {
    page.session.user.set({ ...profile, name: 'Élodie' });
    page.session.status.set('authenticated');
    await page.render('/account');
    expect(page.root.querySelector('dl')?.textContent).toContain('auth.name');
    expect(page.root.querySelector('dl')?.textContent).toContain('Élodie');
    expect(page.root.querySelector('dl')?.textContent).toContain(profile.email);
    expect(page.root.querySelector('dl')?.textContent).toContain(profile.id);
    expect(page.root.querySelector('input')).toBeNull();
    requiredElement<HTMLButtonElement>(page.root, 'button').click();
    await page.harness.fixture.whenStable();
    expect(page.session.logout).toHaveBeenCalledOnce();
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('loads the profile independently of authentication method discovery', async () => {
    TestBed.overrideProvider(AuthenticationConfigService, {
      useFactory: () => {
        throw new Error('Account must not load authentication methods');
      },
    });
    page.session.user.set({ ...profile, name: 'Élodie' });
    page.session.status.set('authenticated');

    await page.render('/account');

    expect(page.root.querySelector('dl')?.textContent).toContain('Élodie');
    expect(page.root.querySelector('form')).toBeNull();
  });

  it('redirects an anonymous visitor to the login page', async () => {
    await page.render('/account');

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(
      page.harness.routeNativeElement?.querySelector('#auth-email')
    ).not.toBeNull();
  });

  it('waits for the session check before redirecting an anonymous visitor', async () => {
    page.session.status.set('loading');
    await page.render('/account');
    expect(TestBed.inject(Router).url).toBe('/account');
    expect(page.root.textContent).toContain('auth.loading');

    page.session.status.set('anonymous');
    await page.harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it.each([true, false])(
    'allows retrying an unavailable session with a known profile (%s)',
    async knownProfile => {
      if (knownProfile) page.session.user.set(profile);
      page.session.status.set('unavailable');
      await page.render('/account');
      expect(TestBed.inject(Router).url).toBe('/account');
      expect(page.root.textContent).toContain('auth.profileUnavailable');
      expect(page.root.querySelector('form')).toBeNull();
      expect(page.root.querySelector('dl') !== null).toBe(knownProfile);
      const retry = Array.from(page.root.querySelectorAll('button')).find(
        button => button.textContent?.includes('auth.retry')
      );
      if (!retry) throw new Error('Session retry is missing');

      retry.click();

      expect(page.session.refresh).toHaveBeenCalledTimes(2);
      expect(page.config.retry).not.toHaveBeenCalled();
    }
  );

  it('preserves the profile after a failed logout and allows retrying', async () => {
    page.session.user.set(profile);
    page.session.status.set('authenticated');
    page.session.logout.mockReturnValue(throwError(() => ({ status: 0 })));
    await page.render('/account');

    requiredElement<HTMLButtonElement>(page.root, 'button').click();
    await page.harness.fixture.whenStable();

    expect(page.root.querySelector('[role="alert"]')?.textContent).toContain(
      'auth.logoutFailed'
    );
    expect(page.root.querySelector('dl')?.textContent).toContain(profile.email);
    expect(
      requiredElement<HTMLButtonElement>(page.root, 'button').disabled
    ).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/account');
  });

  it('prevents duplicate logout requests and cancels the request when leaving the page', async () => {
    const request = new Subject<void>();
    page.session.user.set(profile);
    page.session.status.set('authenticated');
    page.session.logout.mockReturnValue(request);
    await page.render('/account');
    const logout = requiredElement<HTMLButtonElement>(page.root, 'button');

    logout.click();
    logout.click();
    await page.harness.fixture.whenStable();

    expect(logout.disabled).toBe(true);
    expect(page.session.logout).toHaveBeenCalledOnce();
    expect(request.observed).toBe(true);
    await page.harness.navigateByUrl('/notes');
    expect(request.observed).toBe(false);
  });
});
