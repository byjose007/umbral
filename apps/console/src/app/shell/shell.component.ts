import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { NAV_GROUPS } from './nav-items';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="flex h-screen bg-bg text-text">
      <aside class="w-60 shrink-0 border-r border-border bg-surface flex flex-col">
        <div class="px-4 py-4 text-lg font-semibold tracking-tight border-b border-border">
          UMBRAL
        </div>

        <nav class="flex-1 overflow-y-auto py-2">
          @for (group of navGroups; track group.label) {
            <div class="px-4 pt-4 pb-1 text-xs font-medium uppercase tracking-wide text-text-faint">
              {{ group.label }}
            </div>
            @for (item of group.items; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-surface-2 text-accent border-accent"
                class="mx-2 block rounded-md border border-transparent px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
              >
                {{ item.label }}
              </a>
            }
          }
        </nav>
      </aside>

      <div class="flex flex-1 flex-col overflow-hidden">
        <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <div></div>
          @if (authService.operator(); as operator) {
            <div class="flex items-center gap-3 text-sm">
              <div class="text-right">
                <div class="text-text">{{ operator.fullName }}</div>
                <div class="text-text-faint capitalize">{{ operator.role }}</div>
              </div>
              <button
                type="button"
                (click)="onLogout()"
                class="rounded-md border border-border px-3 py-1.5 text-text-muted hover:bg-surface-hover hover:text-text"
              >
                Cerrar sesión
              </button>
            </div>
          }
        </header>

        <main class="flex-1 overflow-y-auto">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  protected readonly navGroups = NAV_GROUPS;

  constructor(
    protected readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async onLogout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
