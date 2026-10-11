import { ChangeDetectionStrategy, Component, input } from '@angular/core';

const paths = {
  document:
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',
  notebook:
    'M4 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4z M8 3v18 M2 7h4 M2 12h4 M2 17h4',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  plus: 'M12 5v14 M5 12h14',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
  chevron: 'M9 5l7 7-7 7',
  tag: 'M20 13l-7 7a2 2 0 0 1-3 0L2 12V2h10l8 8a2 2 0 0 1 0 3 M7 7h.01',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3l1-2h4l1 2 3 2 2 1 2 4-1 2v3l1 2-2 4-2 1-3 2-1 2h-4l-1-2-3-2-2-1-2-4 1-2v-3l-1-2 2-4 2-1z',
  close: 'M6 6l12 12 M18 6L6 18',
  panel: 'M3 3h18v18H3z M9 3v18',
  check: 'M5 12l4 4L19 6',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  arrow: 'M19 12H5 M12 5l-7 7 7 7',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  cloud: 'M7 18H6a4 4 0 0 1-1-8 7 7 0 0 1 13-2 5 5 0 0 1 1 10h-2 M9 17l3 3 5-5',
  sun: 'M12 3V1 M12 23v-2 M3 12H1 M23 12h-2 M5 5L3 3 M21 21l-2-2 M5 19l-2 2 M21 3l-2 2 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  globe:
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18',
} as const;

@Component({
  selector: 'app-icon',
  template:
    '<svg class="size-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="paths[name()]" /></svg>',
  host: { class: 'inline-flex size-4 shrink-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly name = input<keyof typeof paths>('document');
  protected readonly paths = paths;
}
