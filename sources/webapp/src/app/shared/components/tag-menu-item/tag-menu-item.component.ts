import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-tag-menu-item',
  imports: [],
  templateUrl: './tag-menu-item.component.html',
  styleUrl: './tag-menu-item.component.css'
})
export class TagMenuItemComponent {
  @Input() tagName: string = "";
}
