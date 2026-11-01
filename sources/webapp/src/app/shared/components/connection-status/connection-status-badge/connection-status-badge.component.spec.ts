import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionStatusBadgeComponent } from './connection-status-badge.component';
import { ConnectionStatusService } from '../connection-status.service';
import { GlobalConnectionStatus } from '../connection-status.model';

describe('ConnectionStatusBadgeComponent', () => {
  let fixture: ComponentFixture<ConnectionStatusBadgeComponent>;
  let element: HTMLElement;
  let globalStatus: ReturnType<typeof signal<GlobalConnectionStatus>>;
  let connectionChanged: Subject<boolean>;

  beforeEach(async () => {
    globalStatus = signal<GlobalConnectionStatus>('offline');
    connectionChanged = new Subject<boolean>();

    await TestBed.configureTestingModule({
      imports: [ConnectionStatusBadgeComponent],
      providers: [
        {
          provide: ConnectionStatusService,
          useValue: {
            globalStatus,
            serverStatus: signal(false),
            authStatus: signal(false),
            syncStatus: signal('sync-disabled'),
            lastSyncedAt: signal(undefined),
            connectionChanged$: connectionChanged.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConnectionStatusBadgeComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([
    ['offline', 'offline', 'cloud-off', 'warning'],
    ['sign-in-required', 'signInRequired', 'log-in', 'warning'],
    ['synced', 'synced', 'circle-check', 'success'],
    ['syncing', 'syncing', 'refresh-cw', 'success'],
    ['sync-disabled', 'syncDisabled', 'circle-pause', 'warning'],
    ['sync-error', 'syncError', 'cloud-alert', 'error'],
  ] as const)(
    'renders the service global status %s with a Lucide icon',
    (status, label, icon, color) => {
      globalStatus.set(status);
      fixture.detectChanges();
      expect(element.querySelector('[role="status"]')?.textContent).toContain(
        `workspace.connection.${label}`
      );
      expect(
        element
          .querySelector(`[role="status"] .text-${color} svg`)
          ?.classList.contains(`lucide-${icon}`)
      ).toBe(true);
    }
  );

  it('opens on hover, remains open over the details and closes on leaving', () => {
    element.dispatchEvent(new MouseEvent('pointerenter'));
    fixture.detectChanges();
    expect(element.querySelector('[role="tooltip"]')).toBeTruthy();
    element
      .querySelector('[role="tooltip"]')
      ?.dispatchEvent(new MouseEvent('pointerenter'));
    fixture.detectChanges();
    expect(element.querySelector('[role="tooltip"]')).toBeTruthy();
    element.dispatchEvent(new MouseEvent('pointerleave'));
    fixture.detectChanges();
    expect(element.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('opens on keyboard focus, connects the description and dismisses on Escape', () => {
    element.dispatchEvent(new FocusEvent('focusin'));
    fixture.detectChanges();
    const button = element.querySelector('button');
    const tooltip = element.querySelector('[role="tooltip"]');
    expect(button?.getAttribute('aria-expanded')).toBe('true');
    expect(button?.getAttribute('aria-describedby')).toBe(tooltip?.id);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(element.querySelector('[role="tooltip"]')).toBeNull();
    expect(button?.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles on click and closes when clicking outside or moving focus away', () => {
    const button = element.querySelector('button');
    button?.click();
    element.dispatchEvent(new MouseEvent('pointerleave'));
    fixture.detectChanges();
    expect(element.querySelector('[role="tooltip"]')).toBeTruthy();
    button?.click();
    fixture.detectChanges();
    expect(element.querySelector('[role="tooltip"]')).toBeNull();
    button?.click();
    document.body.click();
    fixture.detectChanges();
    expect(element.querySelector('[role="tooltip"]')).toBeNull();
    element.dispatchEvent(new FocusEvent('focusin'));
    element.dispatchEvent(
      new FocusEvent('focusout', { relatedTarget: document.body })
    );
    fixture.detectChanges();
    expect(element.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('does not show an alert for the initial state or sync changes', () => {
    expect(element.querySelector('.alert')).toBeNull();
    globalStatus.set('synced');
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
    element.querySelector<HTMLButtonElement>('.alert button')?.click();
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
