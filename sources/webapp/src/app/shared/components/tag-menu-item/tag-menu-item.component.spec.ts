import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TagMenuItemComponent } from './tag-menu-item.component';

describe('TagMenuItemComponent', () => {
  let component: TagMenuItemComponent;
  let fixture: ComponentFixture<TagMenuItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagMenuItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TagMenuItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
