import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { LucideCircleUserRound, LucideLogOut } from '@lucide/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { AuthenticationService } from '../../../core/server/authentication/authentication.service';

let nextMenuId = 0;

@Component({
  selector: 'app-account-menu',
  imports: [TranslatePipe, LucideCircleUserRound, LucideLogOut],
  templateUrl: './account-menu.component.html',
  host: {
    class: 'relative z-30 inline-flex shrink-0',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
    '(focusout)': 'onFocusOut($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMenuComponent {
  private readonly session = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger =
    viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly untilDestroyed = takeUntilDestroyed();

  readonly open = model(false);
  protected readonly menuId = `account-menu-${nextMenuId++}`;
  protected readonly user = this.session.user;
  protected readonly pending = signal(false);
  protected readonly failed = signal(false);
  protected readonly checkingSession = computed(
    () => !this.user() && this.session.status() === 'loading'
  );
  protected readonly label = computed(() =>
    this.user() ? 'auth.account' : 'auth.login'
  );
  protected readonly initial = computed(() => {
    const user = this.user();
    const name = user?.userName?.trim() || user?.email?.trim() || '';
    return Array.from(name)[0]?.toUpperCase() ?? '';
  });

  constructor() {
    effect(() => {
      if (!this.user()) {
        this.open.set(false);
        this.failed.set(false);
      }
    });
  }

  protected toggle(): void {
    if (this.checkingSession()) return;
    if (!this.user()) {
      void this.router.navigate(['/login']);
      return;
    }
    this.open.update(open => !open);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.contains(event.target)) this.open.set(false);
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!this.contains(event.relatedTarget)) this.open.set(false);
  }

  protected onEscape(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.trigger().nativeElement.focus();
  }

  protected logout(): void {
    if (this.pending()) return;
    this.failed.set(false);
    this.pending.set(true);
    this.session
      .logout()
      .pipe(
        this.untilDestroyed,
        finalize(() => this.pending.set(false))
      )
      .subscribe({
        next: () => {
          const restoreFocus = this.open();
          this.open.set(false);
          if (restoreFocus) this.trigger().nativeElement.focus();
        },
        error: () => this.failed.set(true),
      });
  }

  private contains(target: EventTarget | null): boolean {
    return (
      target instanceof Node && this.element.nativeElement.contains(target)
    );
  }
}
