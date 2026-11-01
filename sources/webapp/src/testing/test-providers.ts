import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';
import { EMPTY } from 'rxjs';
import { PouchDbService } from '../app/core/server/pouchdb/pouchdb.service';
import { SyncService } from '../app/core/server/pouchdb-sync/sync.service';
import { ServerStatusService } from '../app/core/server/server-status/server-status.service';
import { SyncState } from '../app/core/server/pouchdb/pouchdb.model';
import { ConnectionStatusService } from '../app/shared/components/connection-status/connection-status.service';
import { SyncMetadataStore } from '../app/data/sync-metadata/sync-metadata.store';

// Component tests use local doubles instead of starting IndexedDB or network sync.
export default [
  provideRouter([]),
  provideTranslateService(),
  {
    provide: ConnectionStatusService,
    useFactory: () => ({
      globalStatus: signal('offline'),
      serverStatus: signal(false),
      serverVersion: signal(undefined),
      authStatus: signal(false),
      syncStatus: signal('sync-disabled'),
      lastSyncedAt: signal(undefined),
      connectionChanged$: EMPTY,
    }),
  },
  {
    provide: SyncMetadataStore,
    useFactory: () => ({
      metada: signal(undefined),
      save: async () => undefined,
    }),
  },
  {
    provide: PouchDbService,
    useFactory: () => ({
      gets: async () => [],
      changes: () => EMPTY,
    }),
  },
  {
    provide: SyncService,
    useFactory: () => ({
      start: () => undefined,
      state: signal<SyncState>({ status: 'stopped' }),
    }),
  },
  {
    provide: ServerStatusService,
    useFactory: () => ({
      isConnected: signal(false),
      version: signal(undefined),
      connectionChanged$: EMPTY,
    }),
  },
];
