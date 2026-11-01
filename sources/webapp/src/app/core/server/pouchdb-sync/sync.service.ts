import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { PouchDbService } from '../pouchdb/pouchdb.service';
import { SyncState } from '../pouchdb/pouchdb.model';
import { LoggerService } from '../../logger/logger.service';
import { POUCHDB_FACTORY } from '../pouchdb/pouchdb.factory';
import { SyncMetadataStore } from '../../../data/sync-metadata/sync-metadata.store';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly couchDbUrl = environment.couchDbUrl;
  private readonly createDatabase = inject(POUCHDB_FACTORY);
  private readonly pouchDbService = inject(PouchDbService);
  private readonly logger = inject(LoggerService).withContext('SyncService');
  private readonly syncMetadataStore = inject(SyncMetadataStore);

  private syncHandler?: { cancel: () => void };

  private readonly _state = signal<SyncState>({ status: 'stopped' });
  public readonly state = this._state.asReadonly();

  public start(): void {
    if (this.syncHandler) {
      return;
    }

    const remoteDb = this.createDatabase(this.couchDbUrl);
    const sync = this.pouchDbService.syncWith(remoteDb);
    this.syncHandler = sync;

    sync.on('active', () => this.onSyncEvent('active', 'syncing'));
    sync.on('paused', (error?: unknown) =>
      this.onSyncEvent('paused', error ? 'error' : 'idle', error)
    );
    sync.on('denied', (error: unknown) =>
      this.onSyncEvent('denied', 'error', error)
    );
    sync.on('error', (error: unknown) =>
      this.onSyncEvent('error', 'error', error)
    );
    sync.on('change', () =>
      this.syncMetadataStore
        .save({ lastSyncedAt: new Date() })
        .catch((error: unknown) => {
          this.logger.warn('Unable to save synchronization metadata', error);
        })
    );
  }

  public stop(): void {
    if (!this.syncHandler) {
      return;
    }

    this.syncHandler?.cancel();
    this.syncHandler = undefined;

    this.setState('manual.stop', { status: 'stopped' });
  }

  private onSyncEvent(
    syncEvent: string,
    stateStatus: string,
    error?: unknown
  ): void {
    const event = `sync.on.${syncEvent}`;
    const state = {
      status: stateStatus,
      error: this.errorMessage(error),
    } as SyncState;

    this.setState(event, state, error);
  }

  private setState(event: string, state: SyncState, error?: unknown): void {
    this._state.set(state);
    this.logStateChange(event, state, error);
  }

  private logStateChange(
    event: string,
    newSyncState: SyncState,
    syncError?: unknown
  ): void {
    const message = `Sync state changed to: '${newSyncState.status}' (event: '${event}'). `;
    this.logger.info(message, ...(syncError != null ? [syncError] : []));
  }

  private errorMessage(error?: unknown | undefined): string | undefined {
    if (error === undefined) {
      return undefined;
    }

    return error instanceof Error ? error.message : 'Erreur de synchronisation';
  }
}
