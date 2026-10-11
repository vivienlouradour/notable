import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-tag-menu-item',
  imports: [IconComponent],
  templateUrl: './tag-menu-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagMenuItemComponent {
  public readonly tagName = input.required<string>();
}
