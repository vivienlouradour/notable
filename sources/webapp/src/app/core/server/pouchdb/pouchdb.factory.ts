import { InjectionToken } from '@angular/core';
import PouchDB from 'pouchdb-browser';

export const POUCHDB_FACTORY = new InjectionToken<
  (name: string) => PouchDB.Database
>('PouchDB factory', {
  providedIn: 'root',
  factory: () => name => new PouchDB(name),
});
