import { TestBed } from '@angular/core/testing';
import { NEVER, Observable, of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppVersionDto, StatusClient } from '../api/generated/api-client';
import { LoggerService } from '../../logger/logger.service';
import { ServerStatusService } from './server-status.service';

describe('ServerStatusService', () => {
  let health: ReturnType<typeof vi.fn<() => Observable<unknown>>>;
  let version: ReturnType<typeof vi.fn<() => Observable<AppVersionDto>>>;
  const serverVersion: AppVersionDto = { version: '1.2.3' };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    health = vi.fn<() => Observable<unknown>>().mockReturnValue(of({}));
    version = vi
      .fn<() => Observable<AppVersionDto>>()
      .mockReturnValue(of(serverVersion));
    TestBed.configureTestingModule({
      providers: [
        { provide: ServerStatusService, useClass: ServerStatusService },
        {
          provide: StatusClient,
          useValue: { getHealth: health, getVersion: version },
        },
        {
          provide: LoggerService,
          useValue: { withContext: () => ({ info: vi.fn() }) },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('checks connectivity immediately and retrieves the version when connected', () => {
    const service = TestBed.inject(ServerStatusService);
    expect(health).toHaveBeenCalledOnce();
    expect(service.isConnected()).toBe(true);
    expect(service.version()).toEqual(serverVersion);
  });

  it('remains offline when the server is unavailable and does not fetch the version', () => {
    health.mockReturnValue(throwError(() => new Error('offline')));
    const service = TestBed.inject(ServerStatusService);
    expect(service.isConnected()).toBe(false);
    expect(service.version()).toBeUndefined();
    expect(version).not.toHaveBeenCalled();
  });

  it('checks again after thirty seconds without emitting duplicate connection events', async () => {
    const service = TestBed.inject(ServerStatusService);
    const changed = vi.fn();
    service.connectionChanged$.subscribe(changed);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(health).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(health).toHaveBeenCalledTimes(2);
    expect(version).toHaveBeenCalledOnce();
    expect(changed).not.toHaveBeenCalled();
  });

  it('emits disconnection and reconnection and clears the previous version while offline', async () => {
    const service = TestBed.inject(ServerStatusService);
    const changed = vi.fn();
    service.connectionChanged$.subscribe(changed);
    health.mockReturnValue(throwError(() => new Error('offline')));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(service.isConnected()).toBe(false);
    expect(service.version()).toBeUndefined();
    expect(changed).toHaveBeenLastCalledWith(false);
    health.mockReturnValue(of({}));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(service.isConnected()).toBe(true);
    expect(service.version()).toEqual(serverVersion);
    expect(changed).toHaveBeenLastCalledWith(true);
    expect(changed).toHaveBeenCalledTimes(2);
    expect(version).toHaveBeenCalledTimes(2);
  });

  it('times out a stalled health request after five seconds and keeps monitoring', async () => {
    const pending = new Subject();
    health.mockReturnValueOnce(pending);
    const service = TestBed.inject(ServerStatusService);
    expect(pending.observed).toBe(true);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(pending.observed).toBe(false);
    expect(service.isConnected()).toBe(false);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(service.isConnected()).toBe(true);
    expect(health).toHaveBeenCalledTimes(2);
  });

  it.each(['failure', 'timeout'] as const)(
    'keeps a healthy server connected after a version %s',
    async kind => {
      version.mockReturnValue(
        kind === 'failure'
          ? throwError(() => new Error('version unavailable'))
          : NEVER
      );
      const service = TestBed.inject(ServerStatusService);
      await vi.advanceTimersByTimeAsync(5_000);
      expect(service.isConnected()).toBe(true);
      expect(service.version()).toBeUndefined();
      await vi.advanceTimersByTimeAsync(30_000);
      expect(health).toHaveBeenCalledTimes(2);
    }
  );

  it('cancels an in-flight request when the injector is destroyed', () => {
    const pending = new Subject();
    health.mockReturnValue(pending);
    TestBed.inject(ServerStatusService);
    TestBed.resetTestingModule();
    expect(pending.observed).toBe(false);
  });

  it('stops polling after destruction', async () => {
    TestBed.inject(ServerStatusService);
    TestBed.resetTestingModule();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(health).toHaveBeenCalledOnce();
  });
});
