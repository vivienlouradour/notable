import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-lang-switcher',
  imports: [TranslatePipe, LucideChevronDown],
  templateUrl: './lang-switcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangSwitcherComponent {
  private readonly translate = inject(TranslateService);
  protected selectedLang = this.translate.currentLang;

  switchLang(event: Event) {
    const value = (event.target as HTMLSelectElement).value;

    this.selectedLang = value;
    this.translate.use(value);
  }
}
