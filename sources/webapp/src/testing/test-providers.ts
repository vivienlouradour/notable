import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';
import { EMPTY } from 'rxjs';
import { PouchDbService } from '../app/core/server/pouchdb/pouchdb.service';
import { SyncService } from '../app/core/server/pouchdb/sync.service';
import { ServerStatusService } from '../app/core/server/status/server-status.service';
import { SyncState } from '../app/core/server/pouchdb/pouchdb.model';

// Component tests use local doubles instead of starting IndexedDB or network sync.
export default [
  provideRouter([]),
  provideTranslateService(),
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
      connectionChanged$: EMPTY,
    }),
  },
];
