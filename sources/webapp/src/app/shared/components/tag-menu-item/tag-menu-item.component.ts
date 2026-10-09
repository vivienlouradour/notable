import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-tag-menu-item',
  imports: [],
  templateUrl: './tag-menu-item.component.html',
  styleUrl: './tag-menu-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagMenuItemComponent {
  public readonly tagName = input.required<string>();
}
