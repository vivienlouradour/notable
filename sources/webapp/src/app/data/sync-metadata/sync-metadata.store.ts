import { inject, Injectable, signal } from '@angular/core';
import { PouchDbService } from '../../core/server/pouchdb/pouchdb.service';
import { SyncMetadata } from './sync-metadata.model';
import { BaseDocument } from '../../core/server/pouchdb/pouchdb.model';
import { LoggerService } from '../../core/logger/logger.service';

interface SyncMetadataDocument extends BaseDocument {
  lastSyncedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class SyncMetadataStore {
  private readonly dbService = inject(PouchDbService);
  private readonly logger =
    inject(LoggerService).withContext('SyncMetadataStore');
  private readonly syncMetadataDocumentIdentifier = '_local/sync-metadata';

  private readonly _metada = signal<SyncMetadata | undefined>(undefined);

  public readonly metada = this._metada.asReadonly();
  private readonly loaded: Promise<void>;
  private revision?: string;

  constructor() {
    this.loaded = this.load().catch((error: unknown) => {
      this.logger.warn('Unable to load synchronization metadata', error);
    });
  }

  public async save(metadata: SyncMetadata): Promise<void> {
    await this.loaded;

    const document = this.toDocument(metadata);
    if (this.revision) {
      document._rev = this.revision;
    }

    const response = await this.dbService.put(document);
    this.revision = response.rev;
    this._metada.set({ ...metadata });
  }

  private async load(): Promise<void> {
    const dbMetada = await this.dbService.getOrUndefined<SyncMetadataDocument>(
      this.syncMetadataDocumentIdentifier
    );

    this.revision = dbMetada?._rev;
    this._metada.set(this.toSyncMetadata(dbMetada));
  }

  private toSyncMetadata(
    document?: SyncMetadataDocument | undefined
  ): SyncMetadata | undefined {
    return {
      lastSyncedAt: document?.lastSyncedAt
        ? new Date(document.lastSyncedAt)
        : undefined,
    };
  }

  private toDocument(syncMetada: SyncMetadata): SyncMetadataDocument {
    return {
      _id: this.syncMetadataDocumentIdentifier,
      lastSyncedAt: syncMetada.lastSyncedAt?.toISOString(),
    } as SyncMetadataDocument;
  }
}
