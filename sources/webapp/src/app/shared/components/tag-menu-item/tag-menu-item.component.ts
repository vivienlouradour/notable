import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-tag-menu-item',
  imports: [],
  templateUrl: './tag-menu-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tag-menu-item.component.css'
})
export class TagMenuItemComponent {
  public readonly tagName = input.required<string>();
}
