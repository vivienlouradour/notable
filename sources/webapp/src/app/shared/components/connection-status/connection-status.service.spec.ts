import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthenticationService } from '../../../core/server/authentication/authentication.service';
import { AppVersionDto } from '../../../core/server/api/generated/api-client';
import { SyncState } from '../../../core/server/pouchdb/pouchdb.model';
import { SyncService } from '../../../core/server/pouchdb-sync/sync.service';
import { ServerStatusService } from '../../../core/server/server-status/server-status.service';
import { SyncMetadata } from '../../../data/sync-metadata/sync-metadata.model';
import { SyncMetadataStore } from '../../../data/sync-metadata/sync-metadata.store';
import { ConnectionStatusService } from './connection-status.service';

describe('ConnectionStatusService', () => {
  const connected = signal(false);
  const version = signal<AppVersionDto | undefined>(undefined);
  const authenticated = signal(false);
  const state = signal<SyncState>({ status: 'stopped' });
  const metadata = signal<SyncMetadata | undefined>(undefined);
  let service: ConnectionStatusService;

  beforeEach(() => {
    connected.set(false);
    version.set(undefined);
    authenticated.set(false);
    state.set({ status: 'stopped' });
    metadata.set(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: ConnectionStatusService, useClass: ConnectionStatusService },
        {
          provide: AuthenticationService,
          useValue: { isAuthenticated: authenticated },
        },
        {
          provide: ServerStatusService,
          useValue: {
            isConnected: connected,
            version,
            connectionChanged$: EMPTY,
          },
        },
        { provide: SyncService, useValue: { state } },
        { provide: SyncMetadataStore, useValue: { metada: metadata } },
      ],
    });
    service = TestBed.inject(ConnectionStatusService);
  });

  it.each([
    ['stopped', 'sync-disabled'],
    ['syncing', 'syncing'],
    ['idle', 'synced'],
    ['error', 'sync-error'],
  ] as const)(
    'prioritizes server and authentication over sync state %s',
    (status, expected) => {
      state.set({ status });
      expect(service.globalStatus()).toBe('offline');
      expect(service.syncStatus()).toBe(expected);
      connected.set(true);
      expect(service.globalStatus()).toBe('sign-in-required');
      authenticated.set(true);
      expect(service.globalStatus()).toBe(expected);
      connected.set(false);
      expect(service.globalStatus()).toBe('offline');
    }
  );

  it('exposes the latest synchronization date reactively', () => {
    expect(service.lastSyncedAt()).toBeUndefined();
    const date = new Date('2026-10-26T12:40:00Z');
    metadata.set({ lastSyncedAt: date });
    expect(service.lastSyncedAt()).toEqual(date);
  });

  it('exposes the server version only while connected and once available', () => {
    expect(service.serverVersion()).toBeUndefined();
    connected.set(true);
    expect(service.serverVersion()).toBeUndefined();
    version.set({ version: '1.2.3' });
    expect(service.serverVersion()).toBe('1.2.3');
    version.set({ version: '2.0.0' });
    expect(service.serverVersion()).toBe('2.0.0');
    connected.set(false);
    expect(service.serverVersion()).toBeUndefined();
  });
});
