import { inject, Injectable, signal } from '@angular/core';
import PouchDB from 'pouchdb-browser';
import { environment } from '../../../../environments/environment';
import { PouchDbService } from './pouchdb.service';
import { SyncState } from './pouchdb.model';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly couchDbUrl = environment.couchDbUrl;
  private readonly pouchDbService = inject(PouchDbService);
  private syncHandler?: { cancel: () => void };

  private readonly _state = signal<SyncState>({ status: 'stopped' });
  public readonly state = this._state.asReadonly();

  start(): void {
    if (this.syncHandler) {
      return;
    }

    const remoteDb = new PouchDB(this.couchDbUrl);
    const sync = this.pouchDbService.syncWith(remoteDb);
    this.syncHandler = sync;

    sync.on('active', () => {
      this.setState({ status: 'syncing' });
    });

    sync.on('paused', (error?: unknown) => {
      if (error) {
        this.setState({
          status: 'offline',
          error: this.errorMessage(error),
        });
      } else {
        this.setState({ status: 'idle' });
      }
    });

    sync.on('denied', (error: unknown) => {
      this.setState({
        status: 'error',
        error: this.errorMessage(error),
      });
    });

    sync.on('error', (error: unknown) => {
      this.setState({
        status: 'error',
        error: this.errorMessage(error),
      });
    });
  }

  stop(): void {
    this.syncHandler?.cancel();
    this.syncHandler = undefined;

    this.setState({ status: 'stopped' });
  }

  private setState(state: SyncState): void {
    console.log('sync state changed', state);
    this._state.set(state);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Erreur de synchronisation';
  }
}
