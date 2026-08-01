import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HapticsService } from '../../../core/services/haptics.service';

@Component({
  selector: 'app-pin-pad',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-overlay">
      <div class="login-card">
        <div class="umbral-logo">
          <div class="logo-shield">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h1>UMBRAL</h1>
          <p class="tagline">Control de Acceso Digital</p>
        </div>

        <div class="auth-step-badge">
          @if (authMode === 'login') {
            <span>🔒 Ingreso con PIN</span>
          } @else if (authMode === 'activation') {
            <span>1️⃣ Paso 1: Código de Activación</span>
          } @else {
            <span>2️⃣ Paso 2: Define tu PIN de 4 dígitos</span>
          }
        </div>

        @if (error) {
          <div class="login-error">{{ error }}</div>
        }

        <p class="login-subtitle">
          @if (authMode === 'login') { Ingresa tu PIN de 4 dígitos para ingresar }
          @else if (authMode === 'activation') { Ingresa el código de 6 dígitos brindado por tu administración }
          @else { Crea un PIN de 4 dígitos seguro para este dispositivo }
        </p>

        <div class="pin-display">
          @if (authMode === 'activation') {
            @for (dot of activationDots; track $index) {
              <span class="pin-dot" [class.filled]="dot"></span>
            }
          } @else {
            @for (dot of pinDots; track $index) {
              <span class="pin-dot" [class.filled]="dot"></span>
            }
          }
        </div>

        <div class="pin-grid">
          @for (n of pinNumbers; track n) {
            <button
              class="pin-btn"
              [disabled]="isVerifying"
              (click)="onDigitClick(n)"
              [attr.id]="'pin-btn-' + n"
            >
              {{ n }}
            </button>
          }
          <button class="pin-btn pin-action" [disabled]="isVerifying" (click)="onBiometricClick()" id="biometric-btn" title="Biometría">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="bio-icon">
              <path d="M12 2a10 10 0 0 0-10 10c0 5.52 4.48 10 10 10s10-4.48 10-10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button class="pin-btn" [disabled]="isVerifying" (click)="onDigitClick(0)" id="pin-btn-0">0</button>
          <button class="pin-btn pin-action pin-clear" [disabled]="isVerifying" (click)="onClearClick()" id="pin-clear-btn">
            ⌫
          </button>
        </div>

        <div class="auth-footer-actions">
          @if (authMode === 'login') {
            <button
              type="button"
              class="link-btn"
              (click)="modeChange.emit('activation')"
            >
              ⚡ ¿Es tu primera vez o cambiaste de dispositivo?
            </button>
          } @else {
            <button
              type="button"
              class="link-btn cancel-btn"
              (click)="modeChange.emit('login')"
            >
              ← Cancelar y volver
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-overlay {
      position: fixed;
      inset: 0;
      background: linear-gradient(165deg, var(--umbral-bg, #0f1115) 0%, #161922 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1.5rem;
    }

    .login-card {
      width: 100%;
      max-width: 360px;
      text-align: center;
      background: var(--umbral-surface, #171a21);
      border: 1px solid var(--umbral-border, #2a2f3a);
      border-radius: var(--umbral-radius-lg, 16px);
      padding: 2.25rem 1.75rem;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
    }

    .umbral-logo {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .logo-shield {
      width: 52px;
      height: 52px;
      background: rgba(217, 164, 65, 0.12);
      border: 1px solid rgba(217, 164, 65, 0.3);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.75rem;
      color: var(--umbral-accent, #d9a441);
    }

    .logo-shield svg {
      width: 26px;
      height: 26px;
    }

    .umbral-logo h1 {
      font-size: 1.8rem;
      font-weight: 900;
      letter-spacing: 0.18em;
      color: var(--umbral-text, #e6e8ec);
      margin: 0;
    }

    .tagline {
      font-size: 0.75rem;
      color: var(--umbral-text-muted, #9aa1ad);
      margin-top: 0.2rem;
    }

    .auth-step-badge {
      display: inline-block;
      background: rgba(217, 164, 65, 0.12);
      border: 1px solid rgba(217, 164, 65, 0.25);
      border-radius: 999px;
      padding: 0.3rem 0.85rem;
      font-size: 0.72rem;
      color: var(--umbral-accent, #d9a441);
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .login-subtitle {
      font-size: 0.8rem;
      color: var(--umbral-text-muted, #9aa1ad);
      margin-bottom: 1.5rem;
      line-height: 1.4;
    }

    .login-error {
      background: var(--umbral-danger-bg, #3a1618);
      border: 1px solid rgba(229, 72, 77, 0.4);
      border-radius: 8px;
      padding: 0.5rem 0.85rem;
      font-size: 0.78rem;
      color: var(--umbral-danger, #e5484d);
      margin-bottom: 1.25rem;
    }

    .pin-display {
      display: flex;
      justify-content: center;
      gap: 1.1rem;
      margin-bottom: 1.75rem;
    }

    .pin-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--umbral-surface-2, #1f232c);
      border: 1px solid var(--umbral-border-strong, #3a4150);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .pin-dot.filled {
      background: var(--umbral-accent, #d9a441);
      border-color: var(--umbral-accent, #d9a441);
      box-shadow: 0 0 10px rgba(217, 164, 65, 0.5);
      transform: scale(1.2);
    }

    .pin-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .pin-btn {
      background: var(--umbral-surface-2, #1f232c);
      border: 1px solid var(--umbral-border, #2a2f3a);
      border-radius: var(--umbral-radius-md, 10px);
      color: var(--umbral-text, #e6e8ec);
      font-size: 1.4rem;
      font-weight: 600;
      height: 60px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .pin-btn:active {
      transform: scale(0.94);
      background: var(--umbral-surface-hover, #262b36);
      border-color: var(--umbral-accent, #d9a441);
    }

    .pin-action {
      color: var(--umbral-text-muted, #9aa1ad);
    }

    .bio-icon {
      width: 22px;
      height: 22px;
    }

    .pin-clear {
      color: var(--umbral-danger, #e5484d);
    }

    .auth-footer-actions {
      margin-top: 0.5rem;
    }

    .link-btn {
      background: transparent;
      border: none;
      color: var(--umbral-text-muted, #9aa1ad);
      font-size: 0.75rem;
      cursor: pointer;
      transition: color 0.2s ease;
    }

    .link-btn:hover {
      color: var(--umbral-accent, #d9a441);
    }

    .cancel-btn:hover {
      color: var(--umbral-danger, #e5484d);
    }
  `],
})
export class PinPadComponent {
  @Input() authMode: 'login' | 'activation' | 'set-pin' = 'login';
  @Input() error: string | null = null;
  @Input() isVerifying = false;
  @Input() pinDots: boolean[] = [false, false, false, false];
  @Input() activationDots: boolean[] = [false, false, false, false, false, false];

  @Output() digitEntered = new EventEmitter<number>();
  @Output() cleared = new EventEmitter<void>();
  @Output() modeChange = new EventEmitter<'login' | 'activation' | 'set-pin'>();

  private readonly haptics = inject(HapticsService);

  readonly pinNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  onDigitClick(n: number): void {
    this.haptics.lightImpact();
    this.digitEntered.emit(n);
  }

  onClearClick(): void {
    this.haptics.lightImpact();
    this.cleared.emit();
  }

  onBiometricClick(): void {
    this.haptics.mediumImpact();
    // Biometric mock trigger if supported
  }
}
