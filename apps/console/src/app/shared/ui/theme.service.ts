import { Injectable, signal } from '@angular/core';

export type ConsoleTheme = 'light' | 'dark';

const STORAGE_KEY = 'umbral-console-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<ConsoleTheme>(
    (document.documentElement.getAttribute('data-theme') as ConsoleTheme) || 'light',
  );

  toggle(): void {
    this.set(this.theme() === 'light' ? 'dark' : 'light');
  }

  set(theme: ConsoleTheme): void {
    this.theme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage unavailable (private browsing, etc.) — theme still applies for this session.
    }
  }
}
