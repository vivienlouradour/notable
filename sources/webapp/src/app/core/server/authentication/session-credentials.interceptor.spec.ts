import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_URL, AuthClient } from '../api/generated/api-client';
import { AuthenticationService } from './authentication.service';
import { sessionCredentialsInterceptor } from './session-credentials.interceptor';

describe('Session credentials', () => {
  const baseUrl = 'https://notable.invalid/api';
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessionCredentialsInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        { provide: AuthClient, useValue: { me: () => of(null) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it.each([
    [`${baseUrl}/auth/me`, true],
    [`${baseUrl}/auth/builtin/login`, true],
    [`${baseUrl}/auth/logout`, true],
    ['i18n/en.json', false],
    ['https://other.invalid/auth/me', false],
    [`${baseUrl}-other/auth/me`, false],
    ['https://notable.invalid.evil/api/auth/me', false],
  ])('sends credentials to %s: %s', (url, expected) => {
    TestBed.inject(HttpClient).get(url).subscribe();
    const request = http.expectOne(url);
    expect(request.request.withCredentials).toBe(expected);
    request.flush({});
  });

  it('accepts real 201 responses through the generated registration client', async () => {
    const service = TestBed.inject(AuthenticationService);
    const credentials = {
      email: 'user@example.com',
      password: 'Example-password1!',
    };
    const result = firstValueFrom(service.register(credentials));
    const request = http.expectOne(`${baseUrl}/auth/builtin/register`);
    expect(request.request.withCredentials).toBe(true);
    expect(JSON.parse(request.request.body)).toEqual(credentials);
    request.flush(
      new Blob(['{"id":"user-id"}'], { type: 'application/json' }),
      { status: 201, statusText: 'Created' }
    );
    await expect(result).resolves.toBeUndefined();
  });
});
