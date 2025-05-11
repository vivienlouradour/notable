import { AfterViewInit, Component, OnInit } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-lang-switcher',
  imports: [TranslatePipe],
  templateUrl: './lang-switcher.component.html',
  styleUrl: './lang-switcher.component.css'
})
export class LangSwitcherComponent {

  protected selectedLang: string;

  constructor(private translate: TranslateService) {
    this.selectedLang = this.translate.currentLang;
  }

  switchLang(event: Event) {
    const value = (event.target as HTMLSelectElement).value;

    this.selectedLang = value;
    this.translate.use(value);
  }

}
