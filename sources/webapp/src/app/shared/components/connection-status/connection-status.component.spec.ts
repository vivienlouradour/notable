import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SyncState,
  SyncStatus,
} from '../../../core/server/pouchdb/pouchdb.model';
import { SyncService } from '../../../core/server/pouchdb-sync/sync.service';
import { ServerStatusService } from '../../../core/server/status/server-status.service';
import { ConnectionStatusComponent } from './connection-status.component';

describe('ConnectionStatusComponent', () => {
  let fixture: ComponentFixture<ConnectionStatusComponent>;
  let element: HTMLElement;
  let isConnected: ReturnType<typeof signal<boolean>>;
  let syncState: ReturnType<typeof signal<SyncState>>;
  let connectionChanged: Subject<boolean>;

  beforeEach(async () => {
    isConnected = signal(false);
    syncState = signal<SyncState>({ status: 'stopped' });
    connectionChanged = new Subject<boolean>();

    await TestBed.configureTestingModule({
      imports: [ConnectionStatusComponent],
      providers: [
        {
          provide: ServerStatusService,
          useValue: {
            isConnected,
            connectionChanged$: connectionChanged.asObservable(),
          },
        },
        { provide: SyncService, useValue: { state: syncState } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConnectionStatusComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const statuses: SyncStatus[] = [
    'stopped',
    'syncing',
    'idle',
    'offline',
    'error',
    'unauthorized',
  ];

  for (const status of statuses) {
    it(`shows red when disconnected even if sync is ${status}`, () => {
      syncState.set({ status });
      fixture.detectChanges();

      expect(element.querySelector('.status-error')).toBeTruthy();
      expect(element.textContent).toContain('workspace.connection.offline');
    });

    it(`shows the connection and sync state for ${status}`, () => {
      isConnected.set(true);
      syncState.set({ status });
      fixture.detectChanges();

      const syncing = status === 'syncing' || status === 'idle';
      expect(
        element.querySelector(syncing ? '.status-success' : '.status-warning')
      ).toBeTruthy();
      const label =
        status === 'syncing'
          ? 'syncing'
          : status === 'idle'
            ? 'synced'
            : 'serverOnly';
      expect(element.textContent).toContain(`workspace.connection.${label}`);
    });
  }

  it('reacts to server and sync changes without recreating the component', () => {
    isConnected.set(true);
    syncState.set({ status: 'idle' });
    fixture.detectChanges();
    expect(element.querySelector('.status-success')).toBeTruthy();

    syncState.set({ status: 'error' });
    fixture.detectChanges();
    expect(element.querySelector('.status-warning')).toBeTruthy();

    isConnected.set(false);
    fixture.detectChanges();
    expect(element.querySelector('.status-error')).toBeTruthy();
  });

  it('does not show an alert for the initial state or sync changes', () => {
    expect(element.querySelector('.alert')).toBeNull();
    isConnected.set(true);
    syncState.set({ status: 'idle' });
    fixture.detectChanges();
    expect(element.querySelector('.alert')).toBeNull();
  });

  it('shows green and red alerts and gives the latest event five seconds', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    connectionChanged.next(true);
    fixture.detectChanges();
    expect(element.querySelector('.alert-success')?.textContent).toContain(
      'workspace.connection.connectedAlert'
    );

    await vi.advanceTimersByTimeAsync(4000);
    connectionChanged.next(false);
    fixture.detectChanges();
    expect(element.querySelector('.alert-error')?.textContent).toContain(
      'workspace.connection.disconnectedAlert'
    );
    expect(element.querySelector('.alert')?.getAttribute('role')).toBe('alert');

    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();
    expect(element.querySelector('.alert-error')).toBeTruthy();

    await vi.advanceTimersByTimeAsync(4000);
    fixture.detectChanges();
    expect(element.querySelector('.alert')).toBeNull();
  });

  it('allows dismissing an alert', () => {
    connectionChanged.next(true);
    fixture.detectChanges();
    element.querySelector('button')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.alert')).toBeNull();
  });

  it('unsubscribes from connection events and cancels the timer on destruction', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const startTimer = vi.spyOn(globalThis, 'setInterval');
    const cancelTimer = vi.spyOn(globalThis, 'clearInterval');
    connectionChanged.next(true);
    expect(connectionChanged.observed).toBe(true);
    const timerIndex = startTimer.mock.calls.findIndex(
      ([, delay]) => delay === 5000
    );
    expect(timerIndex).toBeGreaterThanOrEqual(0);
    const timerHandle = startTimer.mock.results[timerIndex]?.value;
    expect(timerHandle).toBeDefined();

    fixture.destroy();

    expect(connectionChanged.observed).toBe(false);
    expect(cancelTimer).toHaveBeenCalledWith(timerHandle);
  });
});
