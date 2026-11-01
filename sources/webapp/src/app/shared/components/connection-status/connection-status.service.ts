import { computed, inject, Injectable } from '@angular/core';
import { AuthenticationService } from '../../../core/server/authentication/authentication.service';
import { SyncService } from '../../../core/server/pouchdb-sync/sync.service';
import { ServerStatusService } from '../../../core/server/server-status/server-status.service';
import { GlobalConnectionStatus, SyncStatus } from './connection-status.model';
import { SyncMetadataStore } from '../../../data/sync-metadata/sync-metadata.store';

@Injectable({ providedIn: 'root' })
export class ConnectionStatusService {
  private readonly server = inject(ServerStatusService);
  private readonly auth = inject(AuthenticationService);
  private readonly sync = inject(SyncService);
  private readonly syncMetadataStore = inject(SyncMetadataStore);

  public readonly serverStatus = this.server.isConnected;
  public readonly connectionChanged$ = this.server.connectionChanged$;
  public readonly authStatus = this.auth.isAuthenticated;
  public readonly syncStatus = computed<SyncStatus>(() => {
    switch (this.sync.state().status) {
      case 'stopped':
        return 'sync-disabled';
      case 'syncing':
        return 'syncing';
      case 'error':
        return 'sync-error';
      case 'idle':
        return 'synced';
      default:
        return 'sync-disabled';
    }
  });
  public readonly globalStatus = computed<GlobalConnectionStatus>(() => {
    if (!this.server.isConnected()) {
      return 'offline';
    }

    if (!this.auth.isAuthenticated()) {
      return 'sign-in-required';
    }

    return this.syncStatus();
  });
  public readonly lastSyncedAt = computed<Date | undefined>(() => {
    return this.syncMetadataStore.metada()?.lastSyncedAt;
  });
}
