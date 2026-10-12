import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { AppVersionDto, StatusClient } from '../api/generated/api-client';
import {
  catchError,
  expand,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  timeout,
  timer,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '../../logger/logger.service';

@Injectable({ providedIn: 'root' })
export class ServerStatusService {
  private readonly statusApiClient = inject(StatusClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly logger = inject(LoggerService).withContext(
    'ServerStatusService'
  );

  private readonly intervalMs = 30_000;
  private readonly timeoutMs = 5_000;
  private readonly connectionChangedSubject = new Subject<boolean>();
  private readonly _isConnected = signal<boolean>(false);
  private readonly _version = signal<AppVersionDto | undefined>(undefined);

  public readonly isConnected = this._isConnected.asReadonly();
  public readonly version = this._version.asReadonly();
  public readonly connectionChanged$ =
    this.connectionChangedSubject.asObservable();

  constructor() {
    this.monitor();
  }

  private monitor(): void {
    this.checkServer()
      .pipe(
        expand(() =>
          timer(this.intervalMs).pipe(switchMap(() => this.checkServer()))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private checkServer(): Observable<void> {
    return this.checkHealth().pipe(
      switchMap(connected => {
        const wasConnected = this._isConnected();

        if (connected === wasConnected) {
          return of(void 0);
        }

        this._isConnected.set(connected);
        this.connectionChangedSubject.next(connected);
        const connectionStatus = connected ? 'connected' : 'disconnected';
        this.logger.info(
          `Server connection status changed to '${connectionStatus}'`
        );

        if (!connected) {
          this._version.set(undefined);
          return of(void 0);
        }

        return this.fetchVersion().pipe(
          map(version => {
            this._version.set(version);
            this.logger.info(
              `Server version retrieved '${version.version}'`,
              version
            );

            return void 0;
          }),
          catchError(() => of(void 0))
        );
      })
    );
  }

  private checkHealth() {
    return this.statusApiClient.getHealth().pipe(
      timeout(this.timeoutMs),
      map(() => true),
      catchError(() => of(false))
    );
  }

  private fetchVersion(): Observable<AppVersionDto> {
    return this.statusApiClient.getVersion().pipe(timeout(this.timeoutMs));
  }
}
