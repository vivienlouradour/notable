import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { LoggerService } from '../../logger/logger.service';
import { PouchDbService } from '../pouchdb/pouchdb.service';
import { SyncService } from './sync.service';
import { POUCHDB_FACTORY } from '../pouchdb/pouchdb.factory';

describe('SyncService', () => {
  const remote = {};
  const createDatabase = vi.fn(() => remote);
  let service: SyncService;
  let callbacks: Map<string, (error?: unknown) => void>;
  let cancel: ReturnType<typeof vi.fn>;
  let syncWith: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    callbacks = new Map();
    cancel = vi.fn();
    syncWith = vi.fn(() => ({
      on: (event: string, callback: (error?: unknown) => void) =>
        callbacks.set(event, callback),
      cancel,
    }));
    TestBed.configureTestingModule({
      providers: [
        { provide: SyncService, useClass: SyncService },
        { provide: POUCHDB_FACTORY, useValue: createDatabase },
        { provide: PouchDbService, useValue: { syncWith } },
        {
          provide: LoggerService,
          useValue: { withContext: () => ({ info: vi.fn() }) },
        },
      ],
    });
    service = TestBed.inject(SyncService);
  });

  function emit(event: string, error?: unknown) {
    const callback = callbacks.get(event);
    if (!callback) throw new Error(`Missing sync listener: ${event}`);
    callback(error);
  }

  it('does not open a remote database before synchronization is started', () => {
    expect(service.state()).toEqual({ status: 'stopped' });
    expect(createDatabase).not.toHaveBeenCalled();
    expect(syncWith).not.toHaveBeenCalled();
  });

  it('opens the configured remote database and does not start a second replication', () => {
    service.start();
    service.start();
    expect(createDatabase).toHaveBeenCalledOnce();
    expect(createDatabase).toHaveBeenCalledWith(environment.couchDbUrl);
    expect(syncWith).toHaveBeenCalledOnce();
    expect(syncWith).toHaveBeenCalledWith(remote);
  });

  it('reflects active and paused replication events', () => {
    service.start();
    emit('active');
    expect(service.state().status).toBe('syncing');
    emit('paused');
    expect(service.state().status).toBe('idle');
  });

  it('reports an offline pause and clears the error when replication resumes', () => {
    service.start();
    emit('paused', new Error('network unavailable'));
    expect(service.state()).toEqual({
      status: 'offline',
      error: 'network unavailable',
    });
    emit('active');
    expect(service.state()).toEqual({ status: 'syncing', error: undefined });
  });

  it.each(['denied', 'error'])(
    'reports a replication %s without throwing',
    event => {
      service.start();
      emit(event, new Error('replication failed'));
      expect(service.state()).toEqual({
        status: 'error',
        error: 'replication failed',
      });
    }
  );

  it('can stop and restart an active replication', () => {
    service.start();
    emit('active');
    service.stop();
    service.stop();
    expect(cancel).toHaveBeenCalledOnce();
    expect(service.state()).toEqual({ status: 'stopped' });
    service.start();
    expect(syncWith).toHaveBeenCalledTimes(2);
  });

  it('can stop a paused offline replication', () => {
    service.start();
    emit('paused', new Error('offline'));
    service.stop();
    expect(cancel).toHaveBeenCalledOnce();
    expect(service.state()).toEqual({ status: 'stopped' });
  });

  it('does not cancel anything when stopped before the first start', () => {
    service.stop();
    expect(cancel).not.toHaveBeenCalled();
    expect(service.state()).toEqual({ status: 'stopped' });
  });

  it('keeps replication running when stopped before its first status event', () => {
    service.start();
    service.stop();
    expect(cancel).not.toHaveBeenCalled();
    service.start();
    expect(syncWith).toHaveBeenCalledOnce();
    emit('active');
    service.stop();
    expect(cancel).toHaveBeenCalledOnce();
  });
});
