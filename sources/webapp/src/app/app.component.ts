import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBarComponent } from './shared/layout/nav-bar/nav-bar.component';
import { FooterComponent } from './shared/layout/footer/footer.component';
import { TranslateService } from '@ngx-translate/core';
import { SyncService } from './core/server/pouchdb/sync.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavBarComponent, FooterComponent],
  templateUrl: './app.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'notable';
  private readonly translate = inject(TranslateService);
  private readonly syncService = inject(SyncService);

  constructor() {
    this.translate.addLangs(['fr', 'en']);
    this.translate.setDefaultLang('en');
    this.translate.use('en');

    this.syncService.start();
  }
}
