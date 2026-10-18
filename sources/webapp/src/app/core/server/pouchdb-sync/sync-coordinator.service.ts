import { effect, inject, Injectable } from '@angular/core';
import { ServerStatusService } from '../status/server-status.service';
import { SyncService } from './sync.service';

@Injectable({ providedIn: 'root' })
export class SyncCoordinatorService {
  private readonly serverStatus = inject(ServerStatusService);
  private readonly syncService = inject(SyncService);

  constructor() {
    effect(() => {
      const isConnected = this.serverStatus.isConnected();

      if (isConnected) {
        this.syncService.start();
      } else {
        this.syncService.stop();
      }
    });
  }
}
