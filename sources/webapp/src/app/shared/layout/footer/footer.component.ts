import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ConnectionStatusBadgeComponent } from '../../components/connection-status/connection-status-badge/connection-status-badge.component';

@Component({
  selector: 'app-footer',
  imports: [ConnectionStatusBadgeComponent],
  templateUrl: './footer.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {}
