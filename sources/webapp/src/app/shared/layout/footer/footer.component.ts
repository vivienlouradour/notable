import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NoteStore } from '../../../data/notes/note.store';
import { ConnectionStatusComponent } from '../../components/connection-status/connection-status.component';

@Component({
  selector: 'app-footer',
  imports: [TranslatePipe, ConnectionStatusComponent],
  templateUrl: './footer.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  protected readonly notes = inject(NoteStore).notes;
}
