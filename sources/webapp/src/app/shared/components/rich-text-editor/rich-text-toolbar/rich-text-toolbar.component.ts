import { Component, Input } from '@angular/core';
import { Editor } from '@tiptap/core';
import { NgClass, NgIf } from '@angular/common';

@Component({
  selector: 'app-rich-text-toolbar',
  imports: [NgIf, NgClass],
  templateUrl: './rich-text-toolbar.component.html',
  styleUrl: './rich-text-toolbar.component.css'
})
export class RichTextToolbarComponent {
  @Input() editor: Editor;
}
