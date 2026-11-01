import { TestBed } from '@angular/core/testing';
import { defer, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoggerService } from '../../logger/logger.service';
import {
  AuthClient,
  AuthenticationMethodsResponse,
} from '../api/generated/api-client';
import { AuthenticationConfigService } from './authentication-config.service';

describe('AuthenticationConfigService', () => {
  let response: Subject<AuthenticationMethodsResponse>;
  let getMethods: ReturnType<typeof vi.fn>;
  let subscribe: ReturnType<
    typeof vi.fn<() => Subject<AuthenticationMethodsResponse>>
  >;
  let warn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    response = new Subject<AuthenticationMethodsResponse>();
    subscribe = vi.fn(() => response);
    getMethods = vi.fn(() => defer(subscribe));
    warn = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthClient, useValue: { getMethods } },
        {
          provide: LoggerService,
          useValue: { withContext: () => ({ warn }) },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('exposes undefined while the request is pending', () => {
    const service = TestBed.inject(AuthenticationConfigService);

    expect(service.methods()).toBeUndefined();
    expect(response.observed).toBe(true);
  });

  it('shares a single request and its result across consumers and signal reads', () => {
    const first = TestBed.inject(AuthenticationConfigService);
    const second = TestBed.inject(AuthenticationConfigService);
    const methods: AuthenticationMethodsResponse = {
      builtInMethodResponse: { enabled: true, allowRegistration: false },
      oidcMethodResponse: { enabled: true, displayName: 'SSO' },
    };

    first.methods();
    second.methods();
    response.next(methods);
    response.complete();

    expect(first).toBe(second);
    expect(first.methods()).toEqual(methods);
    expect(second.methods()).toEqual(methods);
    expect(getMethods).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledOnce();
  });

  it('keeps the signal readable when offline without retrying the request', () => {
    const service = TestBed.inject(AuthenticationConfigService);
    const error = new Error('offline');

    response.error(error);

    expect(service.methods()).toBeUndefined();
    expect(
      TestBed.inject(AuthenticationConfigService).methods()
    ).toBeUndefined();
    expect(getMethods).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      'Failed to retrieve authentication methods',
      error
    );
  });

  it('cancels an in-flight request when the injector is destroyed', () => {
    TestBed.inject(AuthenticationConfigService);

    TestBed.resetTestingModule();

    expect(response.observed).toBe(false);
  });

  it('distinguishes errors from loading and retries only on request', () => {
    const service = TestBed.inject(AuthenticationConfigService);
    expect(service.loading()).toBe(true);
    expect(service.failed()).toBe(false);
    response.error(new Error('offline'));
    expect(service.loading()).toBe(false);
    expect(service.failed()).toBe(true);
    response = new Subject<AuthenticationMethodsResponse>();
    service.retry();
    expect(service.loading()).toBe(true);
    expect(service.failed()).toBe(false);
    response.next({ builtInMethodResponse: { enabled: true } });
    response.complete();
    expect(service.loading()).toBe(false);
    expect(service.methods()?.builtInMethodResponse?.enabled).toBe(true);
    expect(getMethods).toHaveBeenCalledTimes(2);
  });
});
