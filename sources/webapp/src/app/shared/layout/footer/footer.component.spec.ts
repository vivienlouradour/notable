import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { beforeEach, describe, expect, it } from 'vitest';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(FooterComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  it('shows the offline connection indicator and only the app name on the right', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(
      root.querySelector('app-connection-status [role="status"] .text-warning')
    ).not.toBeNull();
    expect(root.querySelector('footer > span')?.textContent?.trim()).toBe(
      'Notable'
    );
  });
});
