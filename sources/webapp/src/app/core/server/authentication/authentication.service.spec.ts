import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiException,
  ApplicationUserDto,
  AuthBuiltInClient,
  AuthClient,
} from '../api/generated/api-client';
import { AuthenticationService } from './authentication.service';

describe('AuthenticationService', () => {
  const profile = { id: 'user-id', email: 'user@example.com' };
  const credentials = { email: profile.email, password: 'Example-password1!' };
  let initialProfile: Subject<ApplicationUserDto>;
  let client: {
    me: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let builtIn: {
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
  };
  let service: AuthenticationService;

  beforeEach(() => {
    initialProfile = new Subject<ApplicationUserDto>();
    client = {
      me: vi.fn(() => initialProfile),
      logout: vi.fn(() => of(void 0)),
    };
    builtIn = {
      login: vi.fn(() => of(void 0)),
      register: vi.fn(() => of(void 0)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthClient, useValue: client },
        { provide: AuthBuiltInClient, useValue: builtIn },
      ],
    });
    service = TestBed.inject(AuthenticationService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('restores a read-only profile from the session cookie', () => {
    expect(service.status()).toBe('loading');
    initialProfile.next(profile);
    initialProfile.complete();
    expect(service.status()).toBe('authenticated');
    expect(service.user()).toEqual(profile);
    expect(Object.isFrozen(service.user())).toBe(true);
  });

  it('treats unauthorized as anonymous and permits a later refresh', () => {
    initialProfile.error({ status: 401 });
    expect(service.status()).toBe('anonymous');
    client.me.mockReturnValue(of(profile));
    service.refresh();
    expect(service.user()).toEqual(profile);
  });

  it('cancels an earlier profile check when refreshing', () => {
    const refreshedProfile = new Subject<ApplicationUserDto>();
    client.me.mockReturnValue(refreshedProfile);

    service.refresh();

    expect(initialProfile.observed).toBe(false);
    expect(refreshedProfile.observed).toBe(true);
    refreshedProfile.next(profile);
    expect(service.status()).toBe('authenticated');
    expect(service.user()).toEqual(profile);
  });

  it('preserves an existing profile when the server becomes unavailable', () => {
    initialProfile.next(profile);
    client.me.mockReturnValue(throwError(() => ({ status: 0 })));
    service.refresh();
    expect(service.status()).toBe('unavailable');
    expect(service.user()).toEqual(profile);
    client.me.mockReturnValue(throwError(() => ({ status: 401 })));
    service.refresh();
    expect(service.user()).toBeNull();
  });

  it('bounds an unavailable profile request instead of loading indefinitely', () => {
    vi.useFakeTimers();
    service.refresh();
    vi.advanceTimersByTime(10_000);
    expect(service.status()).toBe('unavailable');
  });

  it('loads the profile after successful login', async () => {
    initialProfile.error({ status: 401 });
    client.me.mockReturnValue(of(profile));
    await expect(firstValueFrom(service.login(credentials))).resolves.toEqual(
      profile
    );
    expect(builtIn.login).toHaveBeenCalledWith(credentials);
    expect(service.user()).toEqual(profile);
  });

  it('does not authenticate when login or the following profile request fails', async () => {
    initialProfile.error({ status: 401 });
    const error = { status: 401 };
    builtIn.login.mockReturnValue(throwError(() => error));
    await expect(firstValueFrom(service.login(credentials))).rejects.toBe(
      error
    );
    expect(client.me).toHaveBeenCalledOnce();
    builtIn.login.mockReturnValue(of(void 0));
    client.me.mockReturnValue(throwError(() => error));
    await expect(firstValueFrom(service.login(credentials))).rejects.toBe(
      error
    );
    expect(service.user()).toBeNull();
  });

  it('handles the generated client rejecting 201 as successful registration without signing in', async () => {
    initialProfile.error({ status: 401 });
    builtIn.register.mockReturnValue(
      throwError(
        () => new ApiException('Unexpected status', 201, '{}', {}, null)
      )
    );
    await expect(
      firstValueFrom(service.register(credentials))
    ).resolves.toBeUndefined();
    expect(builtIn.register).toHaveBeenCalledWith(credentials);
    expect(builtIn.login).not.toHaveBeenCalled();
    expect(service.user()).toBeNull();
  });

  it('propagates registration validation errors', async () => {
    const error = new ApiException(
      'Validation',
      400,
      '{"errors":{}}',
      {},
      null
    );
    builtIn.register.mockReturnValue(throwError(() => error));
    await expect(firstValueFrom(service.register(credentials))).rejects.toBe(
      error
    );
  });

  it.each([204, 401])('clears the profile on logout (%s)', async status => {
    initialProfile.next(profile);
    client.logout.mockReturnValue(
      status === 401 ? throwError(() => ({ status })) : of(void 0)
    );
    await firstValueFrom(service.logout());
    expect(initialProfile.observed).toBe(false);
    expect(service.user()).toBeNull();
    expect(service.status()).toBe('anonymous');
    // An earlier profile request must not restore the logged-out session.
    initialProfile.next(profile);
    expect(service.user()).toBeNull();
  });

  it('retains the profile when logout cannot be confirmed', async () => {
    initialProfile.next(profile);
    client.logout.mockReturnValue(throwError(() => ({ status: 0 })));
    await expect(firstValueFrom(service.logout())).rejects.toEqual({
      status: 0,
    });
    expect(service.user()).toEqual(profile);
  });

  it('ignores an old unauthorized response after a successful login', async () => {
    client.me.mockReturnValue(of(profile));
    await firstValueFrom(service.login(credentials));
    expect(initialProfile.observed).toBe(false);
    initialProfile.error({ status: 401 });
    expect(service.user()).toEqual(profile);
    expect(service.status()).toBe('authenticated');
  });

  it('cancels profile checks when destroyed', () => {
    TestBed.resetTestingModule();
    expect(initialProfile.observed).toBe(false);
  });
});
