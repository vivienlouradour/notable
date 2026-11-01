import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionStatusDetailsComponent } from './connection-status-details.component';
import { SyncStatus } from '../../connection-status.model';
import { ConnectionStatusService } from '../../connection-status.service';

describe('ConnectionStatusDetailsComponent', () => {
  let fixture: ComponentFixture<ConnectionStatusDetailsComponent>;
  const serverStatus = signal(false);
  const authStatus = signal(false);
  const syncStatus = signal<SyncStatus>('sync-disabled');
  const lastSyncedAt = signal<Date | undefined>(undefined);

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 9, 26, 12, 30));
    serverStatus.set(false);
    authStatus.set(false);
    syncStatus.set('sync-disabled');
    lastSyncedAt.set(undefined);
    await TestBed.configureTestingModule({
      imports: [ConnectionStatusDetailsComponent],
      providers: [
        {
          provide: ConnectionStatusService,
          useValue: { serverStatus, authStatus, syncStatus, lastSyncedAt },
        },
      ],
    }).compileComponents();
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', {
      workspace: {
        connection: {
          syncDate: {
            justNow: 'à l’instant',
            todayAt: 'aujourd’hui à {{time}}',
            yesterdayAt: 'hier à {{time}}',
            dateAt: '{{date}} à {{time}}',
          },
        },
      },
    });
    translate.setTranslation('en', {
      workspace: {
        connection: {
          syncDate: {
            justNow: 'just now',
            todayAt: 'today at {{time}}',
            yesterdayAt: 'yesterday at {{time}}',
            dateAt: '{{date}} at {{time}}',
          },
        },
      },
    });
    translate.use('fr');
    fixture = TestBed.createComponent(ConnectionStatusDetailsComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows independent server, authentication and synchronization states reactively', () => {
    const values = () =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('dd'),
        row => row.textContent?.trim()
      );
    expect(values()).toEqual([
      'workspace.connection.offline',
      'workspace.connection.signedOut',
      'workspace.connection.syncDisabled',
    ]);
    serverStatus.set(true);
    authStatus.set(true);
    syncStatus.set('synced');
    fixture.detectChanges();
    expect(values()).toEqual([
      'workspace.connection.online',
      'workspace.connection.signedIn',
      'workspace.connection.upToDate',
    ]);
    syncStatus.set('sync-error');
    fixture.detectChanges();
    expect(values()[2]).toBe('workspace.connection.syncError');
  });

  it.each(['synced', 'syncing', 'sync-disabled', 'sync-error'] as const)(
    'shows the synchronization state %s',
    status => {
      syncStatus.set(status);
      fixture.detectChanges();
      const row = (fixture.nativeElement as HTMLElement).querySelectorAll(
        'dd'
      )[2];
      expect(row?.querySelector('svg')).toBeTruthy();
      expect(row?.textContent?.trim()).toBe(
        `workspace.connection.${{ synced: 'upToDate', syncing: 'syncing', 'sync-disabled': 'syncDisabled', 'sync-error': 'syncError' }[status]}`
      );
    }
  );

  it('shows a fallback before the first sync and preserves the exact datetime', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('workspace.connection.neverSynced');
    const date = new Date(2026, 9, 26, 10, 30);
    lastSyncedAt.set(date);
    fixture.detectChanges();
    expect(root.querySelector('time')?.getAttribute('datetime')).toBe(
      date.toISOString()
    );
    expect(root.querySelector('time')?.textContent?.trim()).toBe(
      'aujourd’hui à 10:30'
    );
    TestBed.inject(TranslateService).use('en');
    fixture.detectChanges();
    expect(root.querySelector('time')?.textContent?.trim()).toBe(
      'today at 10:30'
    );
  });

  it.each([
    [0, 'à l’instant'],
    [59_999, 'à l’instant'],
    [60_000, 'il y a 1 minute'],
    [5 * 60_000, 'il y a 5 minutes'],
    [3_599_999, 'il y a 59 minutes'],
    [3_600_000, 'aujourd’hui à 11:30'],
  ])('formats a sync %i milliseconds ago as %s', (elapsed, expected) => {
    lastSyncedAt.set(new Date(Date.now() - elapsed));
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('time')
        ?.textContent?.trim()
    ).toBe(expected);
  });

  it.each([
    [new Date(2026, 9, 25, 23, 50), 'hier à 23:50'],
    [new Date(2026, 9, 24, 9, 15), 'il y a 2 jours · 24/10/2026 à 09:15'],
    [new Date(2025, 11, 31, 9, 15), 'il y a 299 jours · 31/12/2025 à 09:15'],
  ])('uses local calendar days for %s', (date, expected) => {
    lastSyncedAt.set(date);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('time')
        ?.textContent?.trim()
    ).toBe(expected);
  });

  it('updates relative time while open and cancels the refresh timer on destruction', () => {
    lastSyncedAt.set(new Date(Date.now() - 59_000));
    fixture.detectChanges();
    const text = () =>
      (fixture.nativeElement as HTMLElement)
        .querySelector('time')
        ?.textContent?.trim();
    expect(text()).toBe('à l’instant');
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(text()).toBe('il y a 1 minute');
    vi.advanceTimersByTime(60_000);
    fixture.detectChanges();
    expect(text()).toBe('il y a 2 minutes');
    const clearInterval = vi.spyOn(globalThis, 'clearInterval');
    fixture.destroy();
    expect(clearInterval).toHaveBeenCalled();
  });

  it('switches from today to yesterday when the local day changes', () => {
    vi.setSystemTime(new Date(2026, 9, 26, 23, 59, 59));
    lastSyncedAt.set(new Date(2026, 9, 26, 10, 30));
    // Refresh the clock after changing the system time.
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('time')
        ?.textContent?.trim()
    ).toBe('hier à 10:30');
  });

  it('keeps minute precision across midnight and handles a slightly future date', () => {
    vi.setSystemTime(new Date(2026, 9, 27, 0, 10));
    vi.advanceTimersByTime(1000);
    lastSyncedAt.set(new Date(2026, 9, 26, 23, 50));
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('time')
        ?.textContent?.trim()
    ).toBe('il y a 20 minutes');
    lastSyncedAt.set(new Date(Date.now() + 60_000));
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('time')
        ?.textContent?.trim()
    ).toBe('à l’instant');
  });

  it('handles an invalid stored date without breaking the details', () => {
    lastSyncedAt.set(new Date('invalid'));
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('time')
    ).toBeNull();
  });
});
