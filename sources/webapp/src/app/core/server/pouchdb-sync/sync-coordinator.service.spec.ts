import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerStatusService } from '../server-status/server-status.service';
import { SyncService } from './sync.service';
import { SyncCoordinatorService } from './sync-coordinator.service';
import {
  AuthenticationService,
  SessionStatus,
} from '../authentication/authentication.service';

describe('SyncCoordinatorService', () => {
  const connected = signal(false);
  const status = signal<SessionStatus>('authenticated');
  const sync = { start: vi.fn(), stop: vi.fn() };

  beforeEach(() => {
    connected.set(false);
    status.set('authenticated');
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        SyncCoordinatorService,
        { provide: ServerStatusService, useValue: { isConnected: connected } },
        { provide: SyncService, useValue: sync },
        {
          provide: AuthenticationService,
          useValue: {
            status,
            isAuthenticated: computed(() => status() === 'authenticated'),
          },
        },
      ],
    });
  });

  it('keeps synchronization stopped when starting offline', () => {
    TestBed.inject(SyncCoordinatorService);
    TestBed.tick();
    expect(sync.stop).toHaveBeenCalledOnce();
    expect(sync.start).not.toHaveBeenCalled();
  });

  it('starts synchronization when starting connected', () => {
    connected.set(true);
    TestBed.inject(SyncCoordinatorService);
    TestBed.tick();
    expect(sync.start).toHaveBeenCalledOnce();
    expect(sync.stop).not.toHaveBeenCalled();
  });

  it('starts, stops and restarts synchronization as connectivity changes', () => {
    TestBed.inject(SyncCoordinatorService);
    TestBed.tick();
    connected.set(true);
    TestBed.tick();
    connected.set(false);
    TestBed.tick();
    connected.set(true);
    TestBed.tick();
    expect(sync.start).toHaveBeenCalledTimes(2);
    expect(sync.stop).toHaveBeenCalledTimes(2);
  });

  it('does not react to connectivity changes after destruction', () => {
    TestBed.inject(SyncCoordinatorService);
    TestBed.tick();
    TestBed.resetTestingModule();
    connected.set(true);
    expect(sync.start).not.toHaveBeenCalled();
  });

  it('waits for login and stops replication on logout while the server stays online', () => {
    connected.set(true);
    status.set('anonymous');
    TestBed.inject(SyncCoordinatorService);
    TestBed.tick();
    expect(sync.start).not.toHaveBeenCalled();
    status.set('authenticated');
    TestBed.tick();
    expect(sync.start).toHaveBeenCalledOnce();
    status.set('anonymous');
    TestBed.tick();
    expect(sync.stop).toHaveBeenCalledTimes(2);
  });
});
