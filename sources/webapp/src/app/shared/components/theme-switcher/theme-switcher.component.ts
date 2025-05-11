import { AfterViewInit, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { themeChange } from 'theme-change';

@Component({
  selector: 'app-theme-switcher',
  imports: [TranslatePipe],
  templateUrl: './theme-switcher.component.html',
  styleUrl: './theme-switcher.component.css'
})
export class ThemeSwitcherComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    themeChange(false);
  }
}
