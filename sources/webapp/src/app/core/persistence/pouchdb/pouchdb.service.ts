import PouchDB from 'pouchdb-browser';
import { environment } from '../../../../environments/environment';
import { Injectable } from '@angular/core';
import { BaseDocument, DocumentChange } from './pouchdb.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PouchDbService {
  private readonly db = new PouchDB(environment.localDbName);

  get<T extends BaseDocument>(id: string): Promise<T> {
    return this.db.get<T>(id);
  }

  gets<T extends BaseDocument>(): Promise<T[]> {
    return this.db
      .allDocs({ include_docs: true })
      .then(response =>
        response.rows.filter(row => row.doc).map(r => r.doc! as T)
      );
  }

  put<T extends BaseDocument>(doc: T): Promise<PouchDB.Core.Response> {
    return this.db.put(doc);
  }

  remove<T extends BaseDocument>(doc: T): Promise<PouchDB.Core.Response> {
    return this.db.remove(doc);
  }

  changes<T extends BaseDocument>(
    documentTypeIdentifierFilter?: string
  ): Observable<DocumentChange<T>> {
    return new Observable(subscriber => {
      const changes = this.db.changes<T>({
        since: 'now',
        live: true,
        include_docs: true,
      });

      changes.on('change', change => {
        if (
          documentTypeIdentifierFilter &&
          !change.id.startsWith(documentTypeIdentifierFilter)
        ) {
          return;
        }

        const result: DocumentChange<T> = {
          id: change.id,
          deleted: change.deleted === true,
          doc: change.doc,
        };

        subscriber.next(result);
      });

      changes.on('error', error => {
        subscriber.error(error);
      });

      return () => {
        changes.cancel();
      };
    });
  }

  public syncWith(remoteDb: PouchDB.Database) {
    return this.db
      .sync(remoteDb, {
        live: true,
        retry: true,
      })
      .on('change', info => {
        console.log('Sync change:', info);
      })
      .on('error', err => {
        console.error('Sync error:', err);
      });
  }
}
