import PouchDB from 'pouchdb-browser';
import { environment } from '../../../../environments/environment';
import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class PouchDbService {
  private readonly db = new PouchDB(environment.localDbName);
  private readonly couchDbUrl = environment.couchDbUrl;

  constructor() {
    this.sync();
  }

  get<T>(id: string): Promise<T & PouchDB.Core.GetMeta> {
    return this.db.get<T>(id);
  }

  gets<T>(): Promise<T[]> {
    return this.db.allDocs({ include_docs: true })
      .then(response =>
        response.rows
          .filter(row => row.doc)
          .map(r => r.doc! as T));
  }

  put<T>(doc: T & PouchDB.Core.IdMeta): Promise<PouchDB.Core.Response> {
    return this.db.put(doc);
  }

  remove<T>(doc: T & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta): Promise<PouchDB.Core.Response> {
    return this.db.remove(doc);
  }

  changes<T>() {
    return this.db.changes<T>({
      since: 'now',
      live: true,
      include_docs: true
    });
  }

  private sync(): void {
    this.db.sync(`${this.couchDbUrl}`, {
      live: true,
      retry: true
    }).on('change', info => {
      console.log('Sync change:', info);
    }).on('error', err => {
      console.error('Sync error:', err);
    });
  }
}
