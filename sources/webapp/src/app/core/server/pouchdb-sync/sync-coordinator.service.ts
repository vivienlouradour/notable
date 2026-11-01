import { effect, inject, Injectable } from '@angular/core';
import { ServerStatusService } from '../server-status/server-status.service';
import { SyncService } from './sync.service';
import { AuthenticationService } from '../authentication/authentication.service';

@Injectable({ providedIn: 'root' })
export class SyncCoordinatorService {
  private readonly serverStatus = inject(ServerStatusService);
  private readonly syncService = inject(SyncService);
  private readonly authentication = inject(AuthenticationService);

  constructor() {
    effect(() => {
      const isConnected = this.serverStatus.isConnected();
      const isAuthenticated = this.authentication.isAuthenticated();

      if (isConnected && isAuthenticated) {
        this.syncService.start();
      } else {
        this.syncService.stop();
      }
    });
  }
}
