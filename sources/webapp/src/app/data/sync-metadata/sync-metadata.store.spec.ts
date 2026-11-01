import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoggerService } from '../../core/logger/logger.service';
import { PouchDbService } from '../../core/server/pouchdb/pouchdb.service';
import { SyncMetadataStore } from './sync-metadata.store';

describe('SyncMetadataStore', () => {
  const id = '_local/sync-metadata';
  const date = new Date('2026-10-26T12:40:00Z');
  const getOrUndefined = vi.fn();
  const put = vi.fn();
  const warn = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    getOrUndefined.mockResolvedValue(undefined);
    put.mockResolvedValue({ ok: true, id, rev: '0-1' });
    TestBed.configureTestingModule({
      providers: [
        { provide: SyncMetadataStore, useClass: SyncMetadataStore },
        { provide: PouchDbService, useValue: { getOrUndefined, put } },
        { provide: LoggerService, useValue: { withContext: () => ({ warn }) } },
      ],
    });
  });

  it('loads the previous synchronization date from local storage', async () => {
    getOrUndefined.mockResolvedValue({
      _id: id,
      _rev: '0-1',
      lastSyncedAt: date.toISOString(),
    });
    const store = TestBed.inject(SyncMetadataStore);
    await vi.waitFor(() => expect(store.metada()?.lastSyncedAt).toEqual(date));
  });

  it('reads once and reuses the revision returned by each save', async () => {
    getOrUndefined.mockResolvedValue({ _id: id, _rev: '0-1' });
    const store = TestBed.inject(SyncMetadataStore);
    const later = new Date(date.getTime() + 60000);
    put.mockResolvedValueOnce({ ok: true, id, rev: '0-2' });
    await store.save({ lastSyncedAt: date });
    await store.save({ lastSyncedAt: later });
    expect(getOrUndefined).toHaveBeenCalledExactlyOnceWith(id);
    expect(put).toHaveBeenNthCalledWith(1, {
      _id: id,
      _rev: '0-1',
      lastSyncedAt: date.toISOString(),
    });
    expect(put).toHaveBeenNthCalledWith(2, {
      _id: id,
      _rev: '0-2',
      lastSyncedAt: later.toISOString(),
    });
    expect(store.metada()?.lastSyncedAt).toEqual(later);
  });

  it('waits for the initial read before saving with the existing revision', async () => {
    let resolveLoad!: (document: { _id: string; _rev: string }) => void;
    getOrUndefined.mockReturnValue(
      new Promise(resolve => {
        resolveLoad = resolve;
      })
    );
    const store = TestBed.inject(SyncMetadataStore);
    const saving = store.save({ lastSyncedAt: date });
    expect(put).not.toHaveBeenCalled();
    resolveLoad({ _id: id, _rev: '0-3' });
    await saving;
    expect(put).toHaveBeenCalledWith({
      _id: id,
      _rev: '0-3',
      lastSyncedAt: date.toISOString(),
    });
  });

  it('keeps the previous date after a failed save and allows a later save', async () => {
    const store = TestBed.inject(SyncMetadataStore);
    await store.save({ lastSyncedAt: date });
    put.mockRejectedValueOnce(new Error('storage unavailable'));
    const later = new Date(date.getTime() + 60000);
    await expect(store.save({ lastSyncedAt: later })).rejects.toThrow(
      'storage unavailable'
    );
    expect(store.metada()?.lastSyncedAt).toEqual(date);
    await store.save({ lastSyncedAt: later });
    expect(store.metada()?.lastSyncedAt).toEqual(later);
  });

  it('leaves the app usable when loading local metadata fails', async () => {
    getOrUndefined.mockRejectedValueOnce(new Error('storage unavailable'));
    const store = TestBed.inject(SyncMetadataStore);
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    expect(store.metada()).toBeUndefined();
    await store.save({ lastSyncedAt: date });
    expect(store.metada()?.lastSyncedAt).toEqual(date);
  });
});
