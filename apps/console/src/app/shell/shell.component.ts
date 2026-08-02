import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ConfirmService } from '../shared/ui/confirm.service';
import { ThemeService } from '../shared/ui/theme.service';
import { NAV_GROUPS } from './nav-items';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="flex h-screen bg-bg text-text">
      <!-- Backdrop for the mobile drawer -->
      @if (isSidebarOpen()) {
        <div
          class="fixed inset-0 z-20 bg-black/50 lg:hidden"
          (click)="isSidebarOpen.set(false)"
        ></div>
      }

      <aside
        class="fixed inset-y-0 left-0 z-30 w-60 shrink-0 -translate-x-full border-r border-border bg-surface flex flex-col transition-transform duration-200 lg:static lg:translate-x-0"
        [class.translate-x-0]="isSidebarOpen()"
      >
        <div class="flex items-center justify-between px-4 py-4 border-b border-border">
          <span class="text-lg font-semibold tracking-tight">UMBRAL</span>
          <button
            type="button"
            class="text-text-muted hover:text-text lg:hidden"
            (click)="isSidebarOpen.set(false)"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <nav class="flex-1 overflow-y-auto py-2">
          @for (group of visibleNavGroups(); track group.label) {
            <div class="px-4 pt-4 pb-1 text-xs font-medium uppercase tracking-wide text-text-faint">
              {{ group.label }}
            </div>
            @for (item of group.items; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-surface-2 text-accent border-accent"
                (click)="isSidebarOpen.set(false)"
                class="mx-2 block rounded-md border border-transparent px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
              >
                {{ item.label }}
              </a>
            }
          }
        </nav>
      </aside>

      <div class="flex flex-1 flex-col overflow-hidden">
        <header class="flex items-center justify-between border-b border-border bg-surface px-4 py-3 shadow-sm lg:px-6">
          <button
            type="button"
            class="text-text-muted hover:text-text lg:hidden"
            (click)="isSidebarOpen.set(true)"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <div class="hidden lg:block"></div>
          <div class="flex items-center gap-3 text-sm">
            <button
              type="button"
              class="rounded-md border border-border px-2.5 py-1.5 text-text-muted hover:bg-surface-hover hover:text-text"
              (click)="themeService.toggle()"
              [attr.aria-label]="themeService.theme() === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'"
              [title]="themeService.theme() === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'"
            >
              {{ themeService.theme() === 'light' ? '🌙' : '☀️' }}
            </button>
            @if (authService.operator(); as operator) {
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
            }
          </div>
        </header>

        <main class="flex-1 overflow-y-auto">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  protected readonly isSidebarOpen = signal(false);

  protected readonly visibleNavGroups = computed(() => {
    const role = this.authService.operator()?.role;
    return NAV_GROUPS.filter((group) => !group.roles || (role && group.roles.includes(role)));
  });

  private readonly confirmService = inject(ConfirmService);
  protected readonly themeService = inject(ThemeService);

  constructor(
    protected readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async onLogout(): Promise<void> {
    const confirmed = await this.confirmService.confirm(
      '¿Seguro que quieres cerrar sesión?',
      'Cerrar sesión',
    );
    if (!confirmed) {
      return;
    }
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
