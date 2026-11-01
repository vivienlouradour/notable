import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  LucideCircleCheck,
  LucideCircleX,
  LucideClock3,
  LucideDynamicIcon,
  LucideMonitor,
  LucideRefreshCw,
  LucideServer,
  LucideUserRound,
} from '@lucide/angular';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { interval, map } from 'rxjs';
import { version } from '../../../../../../../package.json';
import { CONNECTION_STATUS_PRESENTATION } from '../../connection-status.presentation';
import { ConnectionStatusService } from '../../connection-status.service';

@Component({
  selector: 'app-connection-status-details',
  imports: [
    TranslatePipe,
    LucideDynamicIcon,
    LucideClock3,
    LucideMonitor,
    LucideServer,
  ],
  templateUrl: './connection-status-details.component.html',
  host: {
    class:
      'card block border border-base-300 bg-base-100 text-base-content shadow-xl',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionStatusDetailsComponent {
  protected readonly applicationVersion = version;
  protected readonly connectionStatusService = inject(ConnectionStatusService);
  private readonly translate = inject(TranslateService);
  private readonly language = toSignal(
    this.translate.onLangChange.pipe(map(event => event.lang)),
    { initialValue: this.translate.currentLang || 'en' }
  );
  private readonly now = toSignal(interval(2000).pipe(map(() => Date.now())), {
    initialValue: Date.now(),
  });

  protected readonly rows = computed(() => {
    const serverOnline = this.connectionStatusService.serverStatus();
    const authenticated = this.connectionStatusService.authStatus();
    const syncStatus = this.connectionStatusService.syncStatus();
    const sync = CONNECTION_STATUS_PRESENTATION[syncStatus];
    return [
      {
        label: 'workspace.connection.server',
        icon: LucideServer.icon,
        statusIcon: serverOnline ? LucideCircleCheck.icon : LucideCircleX.icon,
        value: serverOnline
          ? 'workspace.connection.online'
          : 'workspace.connection.offline',
        color: serverOnline ? 'success' : 'warning',
        spinning: false,
      },
      {
        label: 'workspace.connection.authentication',
        icon: LucideUserRound.icon,
        statusIcon: authenticated ? LucideCircleCheck.icon : LucideCircleX.icon,
        value: authenticated
          ? 'workspace.connection.signedIn'
          : 'workspace.connection.signedOut',
        color: authenticated ? 'success' : 'warning',
        spinning: false,
      },
      {
        label: 'workspace.connection.synchronization',
        icon: LucideRefreshCw.icon,
        statusIcon: sync.icon,
        value:
          syncStatus === 'synced'
            ? 'workspace.connection.upToDate'
            : sync.label,
        color: sync.color,
        spinning: sync.spinning,
      },
    ];
  });

  protected readonly lastSync = computed(() => {
    const date = this.connectionStatusService.lastSyncedAt();
    if (!date || !Number.isFinite(date.getTime())) return undefined;
    return {
      iso: date.toISOString(),
      label: this.formatSyncDate(date, new Date(this.now()), this.language()),
    };
  });

  private formatSyncDate(date: Date, now: Date, language: string): string {
    const elapsedMinutes = Math.floor(
      (now.getTime() - date.getTime()) / 60_000
    );
    const key = 'workspace.connection.syncDate.';
    if (elapsedMinutes < 1) {
      return this.translate.instant(key + 'justNow');
    }

    const relativeTime = new Intl.RelativeTimeFormat(language, {
      numeric: 'always',
    });
    if (elapsedMinutes < 60) {
      return relativeTime.format(-elapsedMinutes, 'minute');
    }

    const time = new Intl.DateTimeFormat(language, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);

    // Compare local calendar days, including days with a daylight-saving change.
    const calendarDay = (value: Date) =>
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
    const days = (calendarDay(now) - calendarDay(date)) / 86_400_000;

    if (days === 0) {
      return this.translate.instant(key + 'todayAt', { time });
    }
    if (days === 1) {
      return this.translate.instant(key + 'yesterdayAt', { time });
    }

    return this.translate.instant(key + 'onDate', {
      date: new Intl.DateTimeFormat(language, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date),
    });
  }
}
