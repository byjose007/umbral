import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { AuthTokens, Operator } from './models';

const REFRESH_TOKEN_KEY = 'umbral_console_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _operator = signal<Operator | null>(null);
  private readonly _accessToken = signal<string | null>(null);

  readonly operator = this._operator.asReadonly();
  readonly isAuthenticated = computed(() => this._operator() !== null);

  constructor(private readonly http: HttpClient) {}

  getAccessToken(): string | null {
    return this._accessToken();
  }

  async login(email: string, password: string): Promise<void> {
    const tokens = await firstValueFrom(
      this.http.post<AuthTokens>(`${API_BASE_URL}/auth/login`, { email, password }),
    );
    this.applyTokens(tokens);
  }

  /** Restores a session from the stored refresh token — called once on app boot. */
  async tryRestoreSession(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return;
    }
    try {
      await this.refresh(refreshToken);
    } catch {
      this.clearSession();
    }
  }

  /** Rotates the refresh token and issues a new access token. Used by the app-boot
   *  restore above and by the HTTP interceptor's silent-refresh-on-401 flow. */
  async refresh(refreshToken?: string): Promise<string> {
    const currentRefreshToken = refreshToken ?? localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!currentRefreshToken) {
      throw new Error('No refresh token available');
    }
    const tokens = await firstValueFrom(
      this.http.post<AuthTokens>(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: currentRefreshToken,
      }),
    );
    this.applyTokens(tokens);
    return tokens.accessToken;
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await firstValueFrom(
          this.http.post(`${API_BASE_URL}/auth/logout`, { refreshToken }),
        );
      } catch {
        // Best-effort — the local session is cleared regardless.
      }
    }
    this.clearSession();
  }

  private applyTokens(tokens: AuthTokens): void {
    this._accessToken.set(tokens.accessToken);
    this._operator.set(tokens.operator);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  private clearSession(): void {
    this._accessToken.set(null);
    this._operator.set(null);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
