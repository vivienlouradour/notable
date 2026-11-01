import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppComponent } from './app.component';
import { AppLayoutComponent } from './shared/layout/workspace-layout/app-layout.component';
import { provideRouter, Router } from '@angular/router';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([{ path: '', component: AppLayoutComponent }])],
    }).compileComponents();
  });

  it('registers French and English and initializes the application in English', () => {
    const translate = TestBed.inject(TranslateService);
    const addLangs = vi.spyOn(translate, 'addLangs');
    const setDefaultLang = vi.spyOn(translate, 'setDefaultLang');
    const use = vi.spyOn(translate, 'use');
    fixture = TestBed.createComponent(AppComponent);
    expect(addLangs).toHaveBeenCalledWith(['fr', 'en']);
    expect(setDefaultLang).toHaveBeenCalledWith('en');
    expect(use).toHaveBeenCalledWith('en');
  });

  it('renders the workspace, routed content container and footer without a backend', async () => {
    fixture = TestBed.createComponent(AppComponent);
    fixture.autoDetectChanges();
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('app-nav-bar')?.textContent).toContain('Notable');
    expect(root.querySelector('aside')).not.toBeNull();
    expect(root.querySelector('main router-outlet')).not.toBeNull();
    expect(
      root.querySelector(
        'app-footer app-connection-status [role="status"] .text-warning'
      )
    ).not.toBeNull();
  });
});
