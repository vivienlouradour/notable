import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoteQuickCreateComponent } from './note-quick-create.component';

describe('NoteQuickCreateComponent', () => {
  let component: NoteQuickCreateComponent;
  let fixture: ComponentFixture<NoteQuickCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoteQuickCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoteQuickCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
