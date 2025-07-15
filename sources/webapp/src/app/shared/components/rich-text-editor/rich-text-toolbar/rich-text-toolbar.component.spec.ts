import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RichTextToolbarComponent } from './rich-text-toolbar.component';

describe('RichTextToolbarComponent', () => {
  let component: RichTextToolbarComponent;
  let fixture: ComponentFixture<RichTextToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RichTextToolbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RichTextToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
