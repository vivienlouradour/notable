import { LucideStar } from '@lucide/angular';
import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-tag-menu-item',
  imports: [LucideStar],
  templateUrl: './tag-menu-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagMenuItemComponent {
  public readonly tagName = input.required<string>();
}
