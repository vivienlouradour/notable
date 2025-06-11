import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateNoteButtonComponent } from './create-note-button.component';

describe('CreateNoteButtonComponent', () => {
  let component: CreateNoteButtonComponent;
  let fixture: ComponentFixture<CreateNoteButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateNoteButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateNoteButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
