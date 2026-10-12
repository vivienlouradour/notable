import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { switchMap, tap, timer } from 'rxjs';
import { SyncService } from '../../../core/server/pouchdb/sync.service';
import { ServerStatusService } from '../../../core/server/status/server-status.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-connection-status',
  imports: [TranslatePipe, IconComponent],
  templateUrl: './connection-status.component.html',
  host: { class: 'inline-flex min-w-0 items-center' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionStatusComponent {
  private readonly serverStatus = inject(ServerStatusService);
  private readonly sync = inject(SyncService);

  protected readonly connectionAlert = signal<boolean | null>(null);
  protected readonly status = computed(() => {
    if (!this.serverStatus.isConnected()) {
      return { color: 'error', label: 'workspace.connection.offline' };
    }

    switch (this.sync.state().status) {
      case 'syncing':
        return { color: 'success', label: 'workspace.connection.syncing' };
      case 'idle':
        return { color: 'success', label: 'workspace.connection.synced' };
      default:
        return { color: 'warning', label: 'workspace.connection.serverOnly' };
    }
  });

  constructor() {
    this.serverStatus.connectionChanged$
      .pipe(
        tap(connected => this.connectionAlert.set(connected)),
        switchMap(() => timer(5000)),
        takeUntilDestroyed()
      )
      .subscribe(() => this.dismissAlert());
  }

  protected dismissAlert(): void {
    this.connectionAlert.set(null);
  }
}
