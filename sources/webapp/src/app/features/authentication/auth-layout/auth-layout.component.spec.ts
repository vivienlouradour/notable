import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  profile,
  setupAuthenticationPageTest,
} from '../../../../testing/authentication-fixtures';
import { AccountPageComponent } from '../account-page/account-page.component';
import { LoginPageComponent } from '../login-page/login-page.component';
import { RegisterPageComponent } from '../register-page/register-page.component';

describe('AuthLayoutComponent', () => {
  let page: ReturnType<typeof setupAuthenticationPageTest>;
  beforeEach(() => {
    page = setupAuthenticationPageTest();
  });

  it.each([
    ['/login', 'auth.loginTitle', LoginPageComponent, 'form'],
    ['/register', 'auth.registerTitle', RegisterPageComponent, '#auth-name'],
    ['/account', 'auth.account', AccountPageComponent, 'dl'],
  ] as const)(
    'shares the layout and projects the content for %s',
    async (path, title, component, content) => {
      if (path === '/account') {
        page.session.user.set(profile);
        page.session.status.set('authenticated');
      }
      await page.render(path);

      expect(page.harness.routeDebugElement?.componentInstance).toBeInstanceOf(
        component
      );
      expect(page.root.querySelectorAll('app-auth-layout')).toHaveLength(1);
      expect(page.root.querySelectorAll('main')).toHaveLength(1);
      expect(page.root.querySelector('h1')?.textContent).toContain(title);
      expect(page.root.querySelector('aside')?.textContent).toContain(
        'auth.brandMessage'
      );
      expect(page.root.querySelector('a[href="/notes"]')).not.toBeNull();
      expect(page.root.querySelector('app-lang-switcher')).not.toBeNull();
      expect(page.root.textContent).toContain('auth.localHint');
      expect(
        page.root.querySelector('main section')?.querySelector(content)
      ).not.toBeNull();
    }
  );

  it.each(['/login', '/register'])(
    'sends an authenticated visitor from %s to their account',
    async path => {
      page.session.user.set(profile);
      page.session.status.set('authenticated');

      await page.render(path);

      expect(TestBed.inject(Router).url).toBe('/account');
      expect(page.harness.routeDebugElement?.componentInstance).toBeInstanceOf(
        AccountPageComponent
      );
    }
  );

  it.each(['/login', '/register'])(
    'waits for a restored session before leaving %s',
    async path => {
      page.session.status.set('loading');
      await page.render(path);
      expect(TestBed.inject(Router).url).toBe(path);
      expect(page.root.textContent).toContain('auth.loading');

      page.session.user.set(profile);
      page.session.status.set('authenticated');
      await page.harness.fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/account');
    }
  );
});
