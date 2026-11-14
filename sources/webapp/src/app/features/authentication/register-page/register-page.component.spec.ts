import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  profile,
  setupAuthenticationPageTest,
} from '../../../../testing/authentication-fixtures';
import { requiredElement } from '../../../../testing/note-fixtures';
import { throwError } from 'rxjs';
import { ApiException } from '../../../core/server/api/generated/api-client';

describe('RegisterPageComponent', () => {
  let page: ReturnType<typeof setupAuthenticationPageTest>;
  beforeEach(() => {
    page = setupAuthenticationPageTest();
  });

  it.each([
    [401, 'auth.invalidCredentials'],
    [403, 'auth.methodUnavailable'],
    [0, 'auth.requestFailed'],
  ])(
    'shows registration errors without discarding the form (%s)',
    async (status, message) => {
      page.session.register.mockReturnValue(throwError(() => ({ status })));
      await page.render('/register');
      page.fillRegistration();

      await page.submit();

      expect(page.root.querySelector('[role="alert"]')?.textContent).toContain(
        message
      );
      expect(
        requiredElement<HTMLInputElement>(page.root, '#auth-name').value
      ).toBe('Example User');
      expect(
        requiredElement<HTMLFieldSetElement>(page.root, 'fieldset').disabled
      ).toBe(false);
    }
  );
  it('shows the accessible name field only during registration', async () => {
    await page.render('/login');
    expect(page.root.querySelector('#auth-name')).toBeNull();
    await page.harness.navigateByUrl('/register');
    const registrationRoot = page.harness.routeNativeElement;
    if (!registrationRoot) throw new Error('Registration did not render');
    const input = requiredElement<HTMLInputElement>(
      registrationRoot,
      '#auth-name'
    );
    expect(input.required).toBe(true);
    expect(input.autocomplete).toBe('name');
    expect(
      registrationRoot.querySelector('label[for="auth-name"]')?.textContent
    ).toContain('auth.name');
    expect(
      requiredElement<HTMLInputElement>(registrationRoot, '#auth-email')
        .autocomplete
    ).toBe('email');
  });

  it.each(['', '   ', '\t\n'])(
    'rejects a blank registration name (%j) before calling the server',
    async name => {
      await page.render('/register');
      page.fillRegistration(name);
      await page.submit();
      const input = requiredElement<HTMLInputElement>(page.root, '#auth-name');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe('name-error');
      expect(page.root.querySelector('#name-error')?.textContent).toContain(
        'auth.nameRequired'
      );
      expect(page.session.register).not.toHaveBeenCalled();
    }
  );

  it('hides registration when disabled and prevents accessing the form directly', async () => {
    page.config.methods.set({
      builtInMethodResponse: { enabled: true, allowRegistration: false },
    });
    await page.render();
    expect(page.root.querySelector('a[href="/register"]')).toBeNull();
    await page.harness.navigateByUrl('/register');
    expect(page.harness.routeNativeElement?.querySelector('form')).toBeNull();
    expect(page.harness.routeNativeElement?.textContent).toContain(
      'auth.registrationDisabled'
    );
  });

  it('requires matching passwords at registration', async () => {
    await page.render('/register');
    page.fillRegistration();
    page.fill('#auth-confirm-password', 'Different-password1!');
    await page.submit();
    expect(page.root.textContent).toContain('auth.passwordMismatch');
    expect(page.session.register).not.toHaveBeenCalled();
  });

  it.each(['Example User', '  Élodie ✨  '])(
    'submits the trimmed display name and returns to login after registration (%s)',
    async name => {
      await page.render('/register');
      page.fillRegistration(name);
      await page.submit();
      expect(page.session.register).toHaveBeenCalledWith({
        email: profile.email,
        password: 'Example-password1!',
        userName: name.trim(),
      });
      expect(page.session.login).not.toHaveBeenCalled();
      expect(TestBed.inject(Router).url).toBe('/login?registered=true');
      expect(page.harness.routeNativeElement?.textContent).toContain(
        'auth.registered'
      );
    }
  );

  it('shows server validation errors as text and tolerates malformed responses', async () => {
    page.session.register.mockReturnValue(
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
    await page.render('/register');
    page.fillRegistration();
    await page.submit();
    expect(page.root.querySelector('[role="alert"] li')?.textContent).toBe(
      '<b>Too short</b>'
    );
    expect(page.root.querySelector('[role="alert"] b')).toBeNull();
    expect(
      requiredElement<HTMLInputElement>(page.root, '#auth-name').value
    ).toBe('Example User');
    page.session.register.mockReturnValue(
      throwError(
        () => new ApiException('Validation', 400, 'not-json', {}, null)
      )
    );
    await page.submit();
    expect(page.root.textContent).toContain('auth.registrationFailed');
  });
});
