import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requiredElement } from '../../../../testing/note-fixtures';
import { LangSwitcherComponent } from './lang-switcher.component';

describe('LangSwitcherComponent', () => {
  let fixture: ComponentFixture<LangSwitcherComponent>;
  let translate: TranslateService;
  let select: HTMLSelectElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LangSwitcherComponent],
    }).compileComponents();
    translate = TestBed.inject(TranslateService);
  });

  async function render(language: string) {
    translate.use(language);
    fixture = TestBed.createComponent(LangSwitcherComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    select = requiredElement<HTMLSelectElement>(
      fixture.nativeElement,
      'select'
    );
  }

  it.each(['en', 'fr'])(
    'initially selects the current %s language',
    async language => {
      await render(language);
      expect(select.value).toBe(language);
      expect(Array.from(select.options, option => option.value)).toEqual([
        'en',
        'fr',
      ]);
      expect(select.getAttribute('aria-label')).toBe('workspace.language');
    }
  );

  it('switches the translation service when the selected language changes', async () => {
    await render('en');
    const use = vi.spyOn(translate, 'use');
    select.value = 'fr';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(use).toHaveBeenCalledWith('fr');
    expect(translate.currentLang).toBe('fr');
    expect(select.value).toBe('fr');
  });
});
