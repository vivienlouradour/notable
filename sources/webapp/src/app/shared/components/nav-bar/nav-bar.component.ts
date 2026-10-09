import { Component, ChangeDetectionStrategy } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink],
  templateUrl: './nav-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './nav-bar.component.css'
})
export class NavBarComponent {
  protected appName = environment.appName;
}
