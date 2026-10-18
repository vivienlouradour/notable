import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerStatusService } from '../status/server-status.service';
import { SyncService } from './sync.service';
import { SyncCoordinatorService } from './sync-coordinator.service';

describe('SyncCoordinatorService', () => {
  const connected = signal(false);
  const sync = { start: vi.fn(), stop: vi.fn() };

  beforeEach(() => {
    connected.set(false);
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        SyncCoordinatorService,
        { provide: ServerStatusService, useValue: { isConnected: connected } },
        { provide: SyncService, useValue: sync },
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
});
