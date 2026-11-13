import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideChevronUp, LucideDynamicIcon, LucideX } from '@lucide/angular';
import { switchMap, tap, timer } from 'rxjs';
import { ConnectionStatusDetailsComponent } from './connection-status-details/connection-status-details.component';
import { CONNECTION_STATUS_PRESENTATION } from '../connection-status.presentation';
import { ConnectionStatusService } from '../connection-status.service';

let nextDetailsId = 0;

@Component({
  selector: 'app-connection-status',
  imports: [
    TranslatePipe,
    LucideX,
    LucideDynamicIcon,
    LucideChevronUp,
    ConnectionStatusDetailsComponent,
  ],
  templateUrl: './connection-status-badge.component.html',
  host: {
    class: 'relative inline-flex min-w-0 items-center',
    '(focusout)': 'onFocusOut($event)',
    '(document:keydown.escape)': 'closeDetails()',
    '(document:click)': 'onDocumentClick($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionStatusBadgeComponent {
  private readonly connectionStatusService = inject(ConnectionStatusService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly detailsId = `connection-status-details-${nextDetailsId++}`;
  protected readonly detailsOpen = signal(false);
  protected readonly connectionAlert = signal<boolean | null>(null);
  protected readonly status = computed(
    () =>
      CONNECTION_STATUS_PRESENTATION[
        this.connectionStatusService.globalStatus()
      ]
  );

  constructor() {
    this.connectionStatusService.connectionChanged$
      .pipe(
        tap(connected => this.connectionAlert.set(connected)),
        switchMap(() => timer(5000)),
        takeUntilDestroyed()
      )
      .subscribe(() => this.dismissAlert());
  }

  protected dismissAlert(): void {
    this.connectionAlert.set(null);
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!this.contains(event.relatedTarget)) {
      this.closeDetails();
    }
  }

  protected toggleDetails(): void {
    this.detailsOpen.update(open => !open);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.contains(event.target)) {
      this.closeDetails();
    }
  }

  protected closeDetails(): void {
    this.detailsOpen.set(false);
  }

  private contains(target: EventTarget | null): boolean {
    return (
      target instanceof Node && this.element.nativeElement.contains(target)
    );
  }
}
