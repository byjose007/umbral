import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PassMode } from '../../../../core/models/user-pass.models';

@Component({
  selector: 'app-pass-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pass-card-container">
      <!-- Status Badge & Countdown Header -->
      <div class="pass-mode-header">
        <div class="pass-mode-badge" [class.duress]="passMode === 'duress'">
          <span class="badge-icon">{{ passMode === 'normal' ? '🛡️' : '🆘' }}</span>
          <span>{{ passMode === 'normal' ? 'Pase Activo · Modo Normal' : 'MODO COACCIÓN SILENCIOSA' }}</span>
        </div>

        <!-- Pill de tiempo restante (Totalmente separado del QR) -->
        <div class="countdown-pill" title="Tiempo de validez del token rotatorio">
          <span class="countdown-text-small">{{ secondsLeft }}s</span>
        </div>
      </div>

      <!-- Credential Card -->
      <div class="credential-card" [class.duress-card]="passMode === 'duress'">
        <!-- Hologram & Brand Header -->
        <div class="card-top-bar">
          <div class="brand-title">
            <span class="brand-icon">U</span>
            <span class="brand-name">UMBRAL PASS</span>
          </div>
          <div class="hologram-chip" title="Credencial Criptográfica">
            <span class="chip-line"></span>
            <span class="chip-line"></span>
          </div>
        </div>

        <!-- User Information -->
        <div class="card-user-meta">
          <span class="user-fullname">{{ userName }}</span>
          <span class="user-sub">{{ userDept }}</span>
        </div>

        <!-- QR Display Container (100% DESPEJADO Y SIN OBSTRUCCIONES) -->
        <div class="qr-wrapper">
          <div class="qr-canvas" [class.rotating]="isRotating">
            @if (qrDataUrl) {
              <img [src]="qrDataUrl" class="qr-image" alt="Código QR Umbral Pass" />
            } @else {
              <div class="qr-grid">
                @for (cell of qrCells; track $index) {
                  <div class="qr-cell" [class.filled]="cell"></div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Marca de Agua y Hora debajo del QR -->
        <div class="qr-sub-meta">
          <span class="wm-text">{{ userName }}</span>
          <span class="wm-time">• {{ currentTimeDisplay }}</span>
        </div>

        <!-- Token Preview & Status -->
        <div class="token-info">
          <code class="token-code">{{ tokenPreview }}</code>
          <p class="token-hint">
            @if (isOnline) {
              ⚡ Código rotatorio dinámico (TOTP 30s)
            } @else {
              📵 Modo sin conexión — Firma local cacheada
            }
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pass-card-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      width: 100%;
      max-width: 380px;
      margin: 0 auto;
    }

    .pass-mode-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 8px;
    }

    .pass-mode-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--umbral-success-bg, #123128);
      border: 1px solid rgba(52, 211, 153, 0.3);
      border-radius: 999px;
      padding: 0.35rem 0.9rem;
      font-size: 0.72rem;
      color: var(--umbral-success, #34d399);
      font-weight: 700;
      letter-spacing: -0.01em;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .pass-mode-badge.duress {
      background: var(--umbral-danger-bg, #3a1618);
      border-color: rgba(229, 72, 77, 0.5);
      color: var(--umbral-danger, #e5484d);
      animation: duress-pulse 1.2s infinite ease-in-out;
    }

    .countdown-pill {
      background: #171a21;
      border: 1px solid var(--umbral-accent, #d9a441);
      border-radius: 999px;
      padding: 0.3rem 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    .countdown-text-small {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--umbral-accent, #d9a441);
      font-family: monospace;
    }

    @keyframes duress-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.75; transform: scale(0.98); }
    }

    /* Credential Card Design */
    .credential-card {
      width: 100%;
      background: linear-gradient(145deg, #1c2029 0%, #12151c 100%);
      border: 1px solid var(--umbral-border-strong, #3a4150);
      border-radius: 20px;
      padding: 1.25rem 1.25rem 1.1rem;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .credential-card::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at 30% 20%, rgba(217, 164, 65, 0.08) 0%, transparent 60%);
      pointer-events: none;
    }

    .duress-card {
      border-color: rgba(229, 72, 77, 0.4);
      background: linear-gradient(145deg, #281416 0%, #150b0c 100%);
    }

    .card-top-bar {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .brand-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .brand-icon {
      width: 28px;
      height: 28px;
      background: var(--umbral-accent, #d9a441);
      color: var(--umbral-accent-text, #1a1406);
      font-weight: 900;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
    }

    .brand-name {
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: var(--umbral-text, #e6e8ec);
    }

    .hologram-chip {
      width: 32px;
      height: 24px;
      background: linear-gradient(135deg, #d9a441, #f5a623);
      border-radius: 5px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 3px;
      gap: 2px;
      box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4);
    }

    .chip-line {
      height: 2px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 1px;
    }

    .card-user-meta {
      text-align: center;
      margin-bottom: 1rem;
    }

    .user-fullname {
      display: block;
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--umbral-text, #e6e8ec);
      letter-spacing: -0.01em;
    }

    .user-sub {
      font-size: 0.72rem;
      color: var(--umbral-text-muted, #9aa1ad);
    }

    /* QR Wrapper (100% Limpio y Despejado - Tamaño Ampliado a 270px) */
    .qr-wrapper {
      position: relative;
      width: 270px;
      height: 270px;
      margin-bottom: 0.6rem;
    }

    .qr-canvas {
      width: 270px;
      height: 270px;
      border-radius: 14px;
      background: #ffffff;
      padding: 16px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      transition: all 0.25s ease;

      .qr-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        image-rendering: pixelated;
        border-radius: 4px;
      }
    }

    .qr-canvas.rotating {
      opacity: 0.3;
      transform: scale(0.96);
    }

    .qr-grid {
      display: grid;
      grid-template-columns: repeat(21, 1fr);
      gap: 1px;
      width: 100%;
      height: 100%;
    }

    .qr-cell {
      background: #ffffff;
      border-radius: 0.5px;
    }

    .qr-cell.filled {
      background: #000000;
    }

    .qr-sub-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 0.8rem;
    }

    .wm-text {
      font-size: 0.68rem;
      color: var(--umbral-accent, #d9a441);
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .wm-time {
      font-size: 0.68rem;
      color: var(--umbral-text-muted, #9aa1ad);
      font-family: monospace;
    }

    /* Token Preview */
    .token-info {
      text-align: center;
      width: 100%;
    }

    .token-code {
      font-family: var(--umbral-font-mono, monospace);
      font-size: 0.62rem;
      color: var(--umbral-text-muted, #9aa1ad);
      word-break: break-all;
      display: block;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
    }

    .token-hint {
      font-size: 0.7rem;
      color: var(--umbral-text-faint, #6b7280);
      margin: 0.4rem 0 0;
    }
  `],
})
export class PassCardComponent {
  @Input() userName = '';
  @Input() userDept = '';
  @Input() passMode: PassMode = 'normal';
  @Input() currentToken = '';
  @Input() tokenPreview = '';
  @Input() qrDataUrl = '';
  @Input() secondsLeft = 30;
  @Input() ringDashOffset = 0;
  @Input() currentTimeDisplay = '';
  @Input() isRotating = false;
  @Input() isOnline = true;
  @Input() qrCells: boolean[] = [];
}
