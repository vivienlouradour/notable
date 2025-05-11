import { AfterViewInit, Component } from '@angular/core';
import { themeChange } from 'theme-change';

@Component({
  selector: 'app-theme-switcher',
  imports: [],
  templateUrl: './theme-switcher.component.html',
  styleUrl: './theme-switcher.component.css'
})
export class ThemeSwitcherComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    themeChange(false);
  }
}
