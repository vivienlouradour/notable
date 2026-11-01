export type GlobalConnectionStatus =
  'offline' | 'sign-in-required' | SyncStatus;

export type SyncStatus = 'synced' | 'syncing' | 'sync-disabled' | 'sync-error';
