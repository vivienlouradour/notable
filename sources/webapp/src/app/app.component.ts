import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ThemeSwitcherComponent } from "./shared/components/theme-switcher/theme-switcher.component";
import { NavBarComponent } from "./shared/components/nav-bar/nav-bar.component";
import { TranslateService } from '@ngx-translate/core';
import { LangSwitcherComponent } from "./shared/components/lang-switcher/lang-switcher.component";
import { TagMenuItemComponent } from './shared/components/tag-menu-item/tag-menu-item.component';
import { NoteService } from './core/note.service';
import { Note } from './shared/models/note.model';
import { Observable, Subject, takeUntil } from 'rxjs';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavBarComponent, ThemeSwitcherComponent, NavBarComponent, LangSwitcherComponent, TagMenuItemComponent, NgFor, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'notable';
  private destroy$ = new Subject<void>();
  protected notes: Note[] = [];
  protected tags: string[] = [];

  constructor(
    private translate: TranslateService,
    private noteService: NoteService) {
    this.translate.addLangs(['fr', 'en']);
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }

  ngOnInit(): void {
    this.noteService
      .notes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notes => {
        this.notes = notes;

        // Use Set to deduplicate efficiently tags
        this.tags = [... new Set(notes.flatMap(note => note.metadata?.tags))];
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
