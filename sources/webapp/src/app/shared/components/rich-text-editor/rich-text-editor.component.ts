import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { RichTextToolbarComponent } from "./rich-text-toolbar/rich-text-toolbar.component";

@Component({
  selector: 'app-note-editor',
  imports: [FormsModule, TiptapEditorDirective, RichTextToolbarComponent],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.css'
})
export class NoteEditorComponent implements OnInit, OnChanges, OnDestroy {
  protected editor = new Editor({
    extensions: [
      StarterKit.configure({
        history: false,
        heading: {
          levels: [1, 2],
        },
      }),
    ],
    onUpdate: ({ editor }) => this.contentChange.emit(editor.getHTML())
  });

  @Input() content: string;
  @Output() contentChange = new EventEmitter<string>();

  ngOnInit(): void {
    this.value = this.content;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) {
      this.value = changes['content'].currentValue;
    }
  }

  protected value: string;

  ngOnDestroy(): void {
    this.editor.destroy();
  }
}
