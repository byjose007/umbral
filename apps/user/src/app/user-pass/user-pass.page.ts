import { Component, signal, computed, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
} from '@ionic/angular/standalone';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppTab = 'pass' | 'history' | 'visitors';
type PassMode = 'normal' | 'duress';
type VisitorStatus = 'active' | 'used' | 'expired';

interface AccessHistoryEntry {
  id: string;
  doorLabel: string;
  eventType: 'ENTRY' | 'EXIT' | 'DENIED' | 'DURESS';
  granted: boolean;
  isDuress: boolean;
  occurredAt: Date;
}

interface VisitorPassRecord {
  id: string;
  visitorName: string;
  visitorEmail?: string;
  validFrom: Date;
  validTo: Date;
  maxUses: number;
  usedCount: number;
  signedQrToken: string;
  shareUrl?: string;
  status: VisitorStatus;
  createdAt: Date;
}

// ─── Page Component ───────────────────────────────────────────────────────────

@Component({
  selector: 'app-user-pass',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-page>
      <ion-content [fullscreen]="true" [scrollY]="false">
        <div class="pwa-shell" [class.duress-mode]="passMode() === 'duress'">

          <!-- ───── LOGIN GATE ─────────────────────────────────────────── -->
          @if (!isAuthenticated()) {
            <div class="login-overlay">
              <div class="login-card">
                <div class="umbral-logo">
                  <span class="logo-icon">🔐</span>
                  <h1>UMBRAL</h1>
                  <p>Pase de Acceso Digital</p>
                </div>

                @if (loginError()) {
                  <div class="login-error">{{ loginError() }}</div>
                }

                <div class="pin-display">
                  @for (dot of pinDots(); track $index) {
                    <span class="pin-dot" [class.filled]="dot">●</span>
                  }
                </div>

                <div class="pin-grid">
                  @for (n of pinNumbers; track n) {
                    <button class="pin-btn" (click)="onPinDigit(n)" [attr.id]="'pin-btn-' + n">
                      {{ n }}
                    </button>
                  }
                  <button class="pin-btn pin-action" (click)="onBiometric()" id="pin-biometric-btn">
                    ☁
                  </button>
                  <button class="pin-btn" (click)="onPinDigit(0)" id="pin-btn-0">0</button>
                  <button class="pin-btn pin-action pin-clear" (click)="clearPin()" id="pin-clear-btn">
                    ⌫
                  </button>
                </div>

                <p class="login-hint">PIN de 4 dígitos o biometría</p>
                <p class="login-demo-hint">Demo: PIN <strong>1234</strong></p>
              </div>
            </div>
          }

          <!-- ───── MAIN APP ───────────────────────────────────────────── -->
          @if (isAuthenticated()) {

            <!-- Header -->
            <header class="app-header">
              <div class="header-left">
                <span class="user-avatar">{{ userInitials() }}</span>
                <div class="user-info">
                  <span class="user-name">{{ currentUser().name }}</span>
                  <span class="user-dept">{{ currentUser().department }}</span>
                </div>
              </div>
              <div class="header-right">
                <span class="conn-indicator" [class.offline]="!isOnline()">
                  {{ isOnline() ? '📶' : '📵' }}
                  <span class="conn-label">{{ isOnline() ? 'En línea' : 'Sin señal' }}</span>
                </span>
                <button class="logout-btn" (click)="logout()" id="logout-btn">Salir</button>
              </div>
            </header>

            <!-- Tab Navigation -->
            <nav class="tab-nav">
              <button class="tab-btn" [class.active]="activeTab() === 'pass'" (click)="setTab('pass')" id="tab-pass">
                <span>🪪</span> Mi Pase
              </button>
              <button class="tab-btn" [class.active]="activeTab() === 'history'" (click)="setTab('history')" id="tab-history">
                <span>📋</span> Historial
              </button>
              <button class="tab-btn" [class.active]="activeTab() === 'visitors'" (click)="setTab('visitors')" id="tab-visitors">
                <span>👤</span> Visitas
              </button>
            </nav>

            <!-- ── TAB: MI PASE ──────────────────────────────────────── -->
            @if (activeTab() === 'pass') {
              <section class="pass-section">
                <div class="pass-mode-badge" [class.duress]="passMode() === 'duress'">
                  {{ passMode() === 'normal' ? '✅ Modo Normal' : '🆘 Coacción Activa' }}
                </div>

                <div class="qr-wrapper">
                  <div class="watermark-overlay">
                    <span class="wm-text">{{ currentUser().name }}</span>
                    <span class="wm-time">{{ currentTimeDisplay() }}</span>
                  </div>
                  <div class="qr-canvas" [class.rotating]="isRotating()">
                    <div class="qr-grid">
                      @for (cell of qrCells(); track $index) {
                        <div class="qr-cell" [class.filled]="cell"></div>
                      }
                    </div>
                    <div class="qr-center-logo">U</div>
                  </div>
                  <div class="countdown-ring">
                    <svg viewBox="0 0 60 60" class="ring-svg">
                      <circle cx="30" cy="30" r="27" class="ring-bg"/>
                      <circle cx="30" cy="30" r="27" class="ring-progress"
                        [style.stroke-dashoffset]="ringDashOffset()"/>
                    </svg>
                    <span class="countdown-text">{{ secondsLeft() }}s</span>
                  </div>
                </div>

                <div class="token-display">
                  <code class="token-code">{{ tokenPreview() }}</code>
                  <p class="token-hint">
                    @if (isOnline()) { Token válido — rota cada 30 segundos }
                    @else { Modo offline — semilla local cacheada }
                  </p>
                </div>

                <div class="panic-section">
                  <button class="panic-btn" (click)="toggleDuress()" id="duress-panic-btn"
                    [class.active]="passMode() === 'duress'">
                    @if (passMode() === 'normal') { 🆘 Activar Coacción Silenciosa }
                    @else { ✅ Desactivar Modo de Coacción }
                  </button>
                  <p class="panic-hint">El QR de coacción alerta silenciosamente a seguridad</p>
                </div>
              </section>
            }

            <!-- ── TAB: HISTORIAL ─────────────────────────────────────── -->
            @if (activeTab() === 'history') {
              <section class="history-section">
                <div class="section-header">
                  <h2>Mis Accesos Recientes</h2>
                  <span class="entry-count">{{ accessHistory().length }} registros</span>
                </div>

                @if (accessHistory().length === 0) {
                  <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    <p>No hay accesos registrados aún</p>
                  </div>
                } @else {
                  <div class="history-list">
                    @for (entry of accessHistory(); track entry.id) {
                      <div class="history-item" [class.denied]="!entry.granted" [class.duress-item]="entry.isDuress">
                        <div class="history-icon">
                          @if (entry.isDuress) { 🆘 }
                          @else if (entry.eventType === 'ENTRY') { 🔓 }
                          @else if (entry.eventType === 'EXIT') { 🚪 }
                          @else { ❌ }
                        </div>
                        <div class="history-info">
                          <span class="history-door">{{ entry.doorLabel }}</span>
                          <span class="history-time">{{ entry.occurredAt | date:'dd/MM/yy HH:mm:ss' }}</span>
                        </div>
                        <span class="history-badge" [class.granted]="entry.granted" [class.denied-badge]="!entry.granted">
                          {{ entry.granted ? 'Concedido' : 'Denegado' }}
                        </span>
                      </div>
                    }
                  </div>
                }
              </section>
            }

            <!-- ── TAB: VISITAS ───────────────────────────────────────── -->
            @if (activeTab() === 'visitors') {
              <section class="visitors-section">
                <div class="section-header">
                  <h2>Pases de Visitantes</h2>
                  <button class="new-pass-btn" (click)="showNewPassForm.set(true)" id="new-visitor-pass-btn">
                    + Nuevo Pase
                  </button>
                </div>

                @if (showNewPassForm()) {
                  <div class="new-pass-modal">
                    <div class="modal-card">
                      <h3>Nuevo Pase de Visita</h3>
                      <div class="form-group">
                        <label for="v-name">Nombre del visitante</label>
                        <input id="v-name" [(ngModel)]="newPass.visitorName" placeholder="Nombre Apellido" class="form-input" />
                      </div>
                      <div class="form-group">
                        <label for="v-email">Email (opcional)</label>
                        <input id="v-email" type="email" [(ngModel)]="newPass.visitorEmail" placeholder="correo@ejemplo.com" class="form-input" />
                      </div>
                      <div class="form-row">
                        <div class="form-group">
                          <label for="v-from">Desde</label>
                          <input id="v-from" type="datetime-local" [(ngModel)]="newPass.validFrom" class="form-input" />
                        </div>
                        <div class="form-group">
                          <label for="v-to">Hasta</label>
                          <input id="v-to" type="datetime-local" [(ngModel)]="newPass.validTo" class="form-input" />
                        </div>
                      </div>
                      <div class="form-group">
                        <label for="v-uses">Usos máximos</label>
                        <input id="v-uses" type="number" [(ngModel)]="newPass.maxUses" min="1" max="10" class="form-input" />
                      </div>
                      <div class="modal-actions">
                        <button class="btn-cancel" (click)="showNewPassForm.set(false)" id="cancel-pass-btn">Cancelar</button>
                        <button class="btn-issue" (click)="issueVisitorPass()" id="issue-pass-btn">Generar Pase</button>
                      </div>
                    </div>
                  </div>
                }

                <div class="pass-filter-tabs">
                  @for (s of passStatusFilters; track s.value) {
                    <button class="filter-btn" [class.active]="visitorPassFilter() === s.value"
                      (click)="visitorPassFilter.set(s.value)" [id]="'filter-' + s.value">
                      {{ s.label }}
                    </button>
                  }
                </div>

                @if (filteredVisitorPasses().length === 0) {
                  <div class="empty-state">
                    <span class="empty-icon">🎟️</span>
                    <p>No hay pases {{ visitorPassFilter() !== 'all' ? visitorPassFilter() + 's' : '' }}</p>
                  </div>
                } @else {
                  <div class="pass-list">
                    @for (pass of filteredVisitorPasses(); track pass.id) {
                      <div class="visitor-pass-card" [class]="'status-' + pass.status">
                        <div class="pass-card-header">
                          <span class="pass-visitor-name">{{ pass.visitorName }}</span>
                          <span class="pass-status-badge {{ pass.status }}">{{ statusLabel(pass.status) }}</span>
                        </div>
                        <div class="pass-card-details">
                          <span>📅 {{ pass.validFrom | date:'dd/MM HH:mm' }} → {{ pass.validTo | date:'dd/MM HH:mm' }}</span>
                          <span>🔢 {{ pass.usedCount }}/{{ pass.maxUses }} usos</span>
                        </div>
                        @if (pass.status === 'active') {
                          <div class="pass-card-actions">
                            <button class="share-btn whatsapp" (click)="shareViaWhatsApp(pass)" [id]="'wa-' + pass.id">
                              📲 WhatsApp
                            </button>
                            <button class="share-btn email" (click)="shareViaEmail(pass)" [id]="'email-' + pass.id">
                              ✉️ Email
                            </button>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </section>
            }

          } <!-- end isAuthenticated -->
        </div>
      </ion-content>
    </ion-page>
  `,
  styles: [`
    .pwa-shell {
      min-height: 100vh;
      background: linear-gradient(145deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
      font-family: 'Inter', system-ui, sans-serif;
      color: #e2e8f0;
      overflow-y: auto;
    }

    .pwa-shell.duress-mode {
      background: linear-gradient(145deg, #1a0a0a 0%, #2d1010 50%, #1a0a0a 100%);
    }

    /* ── Login ── */
    .login-overlay {
      position: fixed;
      inset: 0;
      background: linear-gradient(145deg, #0f0f1a, #1a1a2e);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .login-card {
      width: 90%;
      max-width: 360px;
      text-align: center;
      padding: 2rem 1.5rem;
    }

    .umbral-logo { margin-bottom: 2rem; }

    .logo-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 0.5rem;
    }

    .umbral-logo h1 {
      font-size: 2.2rem;
      font-weight: 900;
      background: linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
      letter-spacing: 0.15em;
    }

    .umbral-logo p {
      font-size: 0.85rem;
      color: #6b7280;
      margin: 0.25rem 0 0;
    }

    .login-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 8px;
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      color: #fca5a5;
      margin-bottom: 1rem;
    }

    .pin-display {
      display: flex;
      justify-content: center;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .pin-dot {
      font-size: 1.5rem;
      color: #374151;
      transition: color 0.2s, transform 0.15s;
    }

    .pin-dot.filled {
      color: #6366f1;
      transform: scale(1.3);
    }

    .pin-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .pin-btn {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      color: #e2e8f0;
      font-size: 1.5rem;
      font-weight: 600;
      height: 68px;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s;
    }

    .pin-btn:active {
      transform: scale(0.92);
      background: rgba(99, 102, 241, 0.4);
    }

    .pin-action { font-size: 1.2rem; color: #9ca3af; }
    .pin-clear { color: #f87171; }

    .login-hint { font-size: 0.75rem; color: #4b5563; margin: 0; }
    .login-demo-hint { font-size: 0.7rem; color: #374151; margin: 0.25rem 0 0; }

    /* ── Header ── */
    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .header-left { display: flex; align-items: center; gap: 0.75rem; }

    .user-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    .user-name { display: block; font-weight: 600; font-size: 0.9rem; }
    .user-dept { font-size: 0.7rem; color: #6b7280; }

    .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; }

    .conn-indicator {
      font-size: 0.68rem;
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 0.2rem;
    }
    .conn-indicator.offline { color: #ef4444; }

    .logout-btn {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: #6b7280;
      font-size: 0.68rem;
      padding: 0.2rem 0.5rem;
      cursor: pointer;
    }

    /* ── Tabs ── */
    .tab-nav {
      display: flex;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      position: sticky;
      top: 73px;
      background: #0f0f1a;
      z-index: 9;
    }

    .tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: #6b7280;
      font-size: 0.78rem;
      padding: 0.7rem 0.25rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
      border-bottom: 2px solid transparent;
      transition: color 0.2s;
    }

    .tab-btn.active { color: #a78bfa; border-bottom-color: #7c3aed; }

    /* ── QR Pass Section ── */
    .pass-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.25rem 1rem;
      gap: 1rem;
    }

    .pass-mode-badge {
      background: rgba(16,185,129,0.15);
      border: 1px solid rgba(16,185,129,0.3);
      border-radius: 999px;
      padding: 0.3rem 1rem;
      font-size: 0.73rem;
      color: #34d399;
      font-weight: 600;
    }

    .pass-mode-badge.duress {
      background: rgba(239,68,68,0.15);
      border-color: rgba(239,68,68,0.4);
      color: #fca5a5;
      animation: duress-pulse 1s ease-in-out infinite;
    }

    @keyframes duress-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }

    .qr-wrapper {
      position: relative;
      width: 248px;
      height: 248px;
    }

    .watermark-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      pointer-events: none;
      z-index: 2;
      padding: 0.5rem;
    }

    .wm-text {
      font-size: 0.55rem;
      color: rgba(99,102,241,0.5);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .wm-time {
      font-size: 0.48rem;
      color: rgba(139,92,246,0.4);
      font-family: 'Courier New', monospace;
      animation: time-flicker 1s step-end infinite;
    }

    @keyframes time-flicker { 0%,100% { opacity: 0.4; } 50% { opacity: 0.85; } }

    .qr-canvas {
      width: 248px;
      height: 248px;
      border-radius: 18px;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 0 48px rgba(99,102,241,0.35);
      transition: all 0.3s ease;
      overflow: hidden;
      padding: 16px;
      box-sizing: border-box;
    }

    .qr-canvas.rotating { opacity: 0.35; transform: scale(0.95); }

    .qr-grid {
      display: grid;
      grid-template-columns: repeat(21, 1fr);
      gap: 1px;
      width: 100%;
      height: 100%;
      position: relative;
    }

    .qr-cell { background: white; border-radius: 1px; }
    .qr-cell.filled { background: #111827; }

    .qr-center-logo {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 38px;
      height: 38px;
      background: white;
      border: 2.5px solid #6366f1;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 1.25rem;
      color: #6366f1;
    }

    .countdown-ring {
      position: absolute;
      bottom: -14px;
      right: -14px;
      width: 54px;
      height: 54px;
    }

    .ring-svg { transform: rotate(-90deg); }

    .ring-bg { fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 5; }

    .ring-progress {
      fill: none;
      stroke: #7c3aed;
      stroke-width: 5;
      stroke-dasharray: 169.6;
      stroke-linecap: round;
      transition: stroke-dashoffset 1s linear;
    }

    .countdown-text {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.62rem;
      font-weight: 800;
      color: #a78bfa;
    }

    .token-display { text-align: center; width: 100%; }

    .token-code {
      font-family: 'Courier New', monospace;
      font-size: 0.6rem;
      color: #4b5563;
      word-break: break-all;
      display: block;
    }

    .token-hint { font-size: 0.7rem; color: #374151; margin: 0.3rem 0 0; }

    .panic-section { text-align: center; width: 100%; }

    .panic-btn {
      background: rgba(239,68,68,0.07);
      border: 1px solid rgba(239,68,68,0.18);
      border-radius: 12px;
      color: #f87171;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.7rem 1.5rem;
      cursor: pointer;
      width: 100%;
      transition: all 0.2s;
    }

    .panic-btn.active {
      background: rgba(239,68,68,0.18);
      border-color: rgba(239,68,68,0.45);
      animation: panic-pulse 1.5s infinite;
    }

    @keyframes panic-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.35); }
      50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
    }

    .panic-hint { font-size: 0.66rem; color: #374151; margin: 0.35rem 0 0; }

    /* ── History ── */
    .history-section, .visitors-section { padding: 1rem; }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.85rem;
    }

    .section-header h2 { font-size: 0.95rem; font-weight: 700; margin: 0; color: #c4b5fd; }
    .entry-count { font-size: 0.72rem; color: #6b7280; }

    .empty-state { text-align: center; padding: 3rem 1rem; color: #4b5563; }
    .empty-icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }

    .history-list { display: flex; flex-direction: column; gap: 0.5rem; }

    .history-item {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      padding: 0.7rem 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .history-item.denied { border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.04); }
    .history-item.duress-item { border-color: rgba(239,68,68,0.45); background: rgba(239,68,68,0.1); }

    .history-icon { font-size: 1.1rem; }
    .history-info { flex: 1; display: flex; flex-direction: column; }
    .history-door { font-size: 0.82rem; font-weight: 600; }
    .history-time { font-size: 0.68rem; color: #6b7280; }

    .history-badge {
      font-size: 0.67rem;
      font-weight: 700;
      padding: 0.18rem 0.5rem;
      border-radius: 6px;
    }

    .history-badge.granted { background: rgba(16,185,129,0.12); color: #34d399; }
    .history-badge.denied-badge { background: rgba(239,68,68,0.12); color: #f87171; }

    /* ── Visitors ── */
    .new-pass-btn {
      background: linear-gradient(135deg, #6366f1, #7c3aed);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.45rem 0.85rem;
      cursor: pointer;
    }

    .new-pass-modal {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.75);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      z-index: 200;
    }

    .modal-card {
      background: #1e1b4b;
      border-top-left-radius: 22px;
      border-top-right-radius: 22px;
      padding: 1.5rem;
      width: 100%;
      max-width: 430px;
      box-sizing: border-box;
    }

    .modal-card h3 { font-size: 0.95rem; font-weight: 700; margin: 0 0 1rem; color: #c4b5fd; }

    .form-group { margin-bottom: 0.7rem; }

    .form-group label { display: block; font-size: 0.72rem; color: #6b7280; margin-bottom: 0.25rem; }

    .form-input {
      width: 100%;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 0.82rem;
      padding: 0.5rem 0.7rem;
      box-sizing: border-box;
      outline: none;
    }

    .form-input:focus { border-color: #6366f1; }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }

    .modal-actions { display: flex; gap: 0.7rem; margin-top: 1rem; }

    .btn-cancel {
      flex: 1;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      color: #9ca3af;
      padding: 0.6rem;
      cursor: pointer;
    }

    .btn-issue {
      flex: 2;
      background: linear-gradient(135deg, #6366f1, #7c3aed);
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 700;
      padding: 0.6rem;
      cursor: pointer;
    }

    .pass-filter-tabs { display: flex; gap: 0.5rem; margin-bottom: 0.7rem; }

    .filter-btn {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px;
      color: #6b7280;
      font-size: 0.72rem;
      padding: 0.3rem 0.7rem;
      cursor: pointer;
    }

    .filter-btn.active {
      background: rgba(99,102,241,0.18);
      border-color: rgba(99,102,241,0.45);
      color: #a78bfa;
    }

    .pass-list { display: flex; flex-direction: column; gap: 0.7rem; }

    .visitor-pass-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 0.85rem 1rem;
    }

    .visitor-pass-card.status-expired { opacity: 0.45; }

    .pass-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
    }

    .pass-visitor-name { font-weight: 600; font-size: 0.88rem; }

    .pass-status-badge {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      text-transform: uppercase;
    }

    .pass-status-badge.active { background: rgba(16,185,129,0.13); color: #34d399; }
    .pass-status-badge.used { background: rgba(245,158,11,0.13); color: #fbbf24; }
    .pass-status-badge.expired { background: rgba(107,114,128,0.13); color: #6b7280; }

    .pass-card-details {
      display: flex;
      flex-direction: column;
      gap: 0.18rem;
      font-size: 0.72rem;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }

    .pass-card-actions { display: flex; gap: 0.5rem; }

    .share-btn {
      flex: 1;
      border: none;
      border-radius: 8px;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.4rem;
      cursor: pointer;
    }

    .share-btn.whatsapp {
      background: rgba(37,211,102,0.13);
      color: #4ade80;
      border: 1px solid rgba(37,211,102,0.22);
    }

    .share-btn.email {
      background: rgba(99,102,241,0.13);
      color: #a78bfa;
      border: 1px solid rgba(99,102,241,0.22);
    }
  `],
})
export class UserPassPage implements OnInit, OnDestroy {
  // ─── Auth ─────────────────────────────────────────────────────────────────

  isAuthenticated = signal(false);
  loginError = signal<string | null>(null);

  currentUser = signal({
    id: 'person-demo-001',
    name: 'Byron José López',
    department: 'Tecnología · Piso 4',
  });

  userInitials = computed(() => {
    const parts = this.currentUser().name.split(' ');
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  });

  private pinValue = '';
  pinDots = signal([false, false, false, false]);
  readonly pinNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  private readonly DEMO_PIN = '1234';

  // ─── Navigation ───────────────────────────────────────────────────────────

  activeTab = signal<AppTab>('pass');
  isOnline = signal(navigator.onLine);

  // ─── QR Token ─────────────────────────────────────────────────────────────

  passMode = signal<PassMode>('normal');
  currentToken = signal('');
  secondsLeft = signal(30);
  isRotating = signal(false);

  tokenPreview = computed(() => {
    const t = this.currentToken();
    return t ? t.substring(0, 34) + '…' : 'Generando…';
  });

  ringDashOffset = computed(() => {
    const circumference = 169.6;
    return circumference - (this.secondsLeft() / 30) * circumference;
  });

  currentTimeDisplay = signal(new Date().toISOString().substring(11, 23));
  qrCells = signal<boolean[]>(this._randomQrCells());

  private _timer?: ReturnType<typeof setInterval>;
  private _clockTimer?: ReturnType<typeof setInterval>;
  private _onlineHandler = () => this.isOnline.set(true);
  private _offlineHandler = () => this.isOnline.set(false);

  // ─── Visitor Passes ───────────────────────────────────────────────────────

  accessHistory = signal<AccessHistoryEntry[]>([]);
  visitorPasses = signal<VisitorPassRecord[]>([]);
  showNewPassForm = signal(false);
  visitorPassFilter = signal<string>('all');

  filteredVisitorPasses = computed(() => {
    const f = this.visitorPassFilter();
    return f === 'all'
      ? this.visitorPasses()
      : this.visitorPasses().filter((p) => p.status === f);
  });

  readonly passStatusFilters = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'used', label: 'Usados' },
    { value: 'expired', label: 'Vencidos' },
  ];

  newPass = { visitorName: '', visitorEmail: '', validFrom: '', validTo: '', maxUses: 1 };

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    window.addEventListener('online', this._onlineHandler);
    window.addEventListener('offline', this._offlineHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this._onlineHandler);
    window.removeEventListener('offline', this._offlineHandler);
    this._stopTimers();
  }

  // ─── Auth Methods ─────────────────────────────────────────────────────────

  onPinDigit(n: number): void {
    if (this.pinValue.length >= 4) return;
    this.pinValue += n.toString();
    this.pinDots.set([false, false, false, false].map((_, i) => i < this.pinValue.length));
    if (this.pinValue.length === 4) setTimeout(() => this._checkPin(), 200);
  }

  clearPin(): void {
    this.pinValue = this.pinValue.slice(0, -1);
    this.pinDots.set([false, false, false, false].map((_, i) => i < this.pinValue.length));
  }

  onBiometric(): void {
    this.loginError.set(null);
    this._onLoginSuccess();
  }

  private _checkPin(): void {
    if (this.pinValue === this.DEMO_PIN) {
      this.loginError.set(null);
      this._onLoginSuccess();
    } else {
      this.loginError.set('PIN incorrecto. Intenta de nuevo.');
      this.pinValue = '';
      this.pinDots.set([false, false, false, false]);
    }
  }

  private _onLoginSuccess(): void {
    this.isAuthenticated.set(true);
    this._loadDemoHistory();
    this._startQrRotation();
    this._startClock();
  }

  logout(): void {
    this.isAuthenticated.set(false);
    this.pinValue = '';
    this.pinDots.set([false, false, false, false]);
    this.passMode.set('normal');
    this._stopTimers();
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  setTab(tab: AppTab): void { this.activeTab.set(tab); }

  // ─── QR Methods ───────────────────────────────────────────────────────────

  private _generateToken(): void {
    const personId = this.currentUser().id;
    const nowMs = Date.now();
    const stepSec = 30;
    const timeBucket = Math.floor(nowMs / 1000 / stepSec);
    const modeFlag = this.passMode() === 'duress' ? 'D' : 'N';
    const sig = Math.random().toString(36).substring(2, 18);
    this.currentToken.set(`UMBRAL-UP-v1.${personId}.${timeBucket}.${modeFlag}.${sig}`);
    this.qrCells.set(this._randomQrCells());
  }

  private _startQrRotation(): void {
    this._generateToken();
    const secondsInBucket = Math.floor(Date.now() / 1000) % 30;
    this.secondsLeft.set(30 - secondsInBucket);

    this._timer = setInterval(() => {
      this.secondsLeft.update((s) => {
        if (s <= 1) { this._rotateToken(); return 30; }
        return s - 1;
      });
    }, 1000);
  }

  private _rotateToken(): void {
    this.isRotating.set(true);
    setTimeout(() => { this._generateToken(); this.isRotating.set(false); }, 300);
  }

  private _startClock(): void {
    this._clockTimer = setInterval(() => {
      this.currentTimeDisplay.set(new Date().toISOString().substring(11, 23));
    }, 100);
  }

  private _stopTimers(): void {
    if (this._timer) clearInterval(this._timer);
    if (this._clockTimer) clearInterval(this._clockTimer);
  }

  toggleDuress(): void {
    this.passMode.update((m) => (m === 'normal' ? 'duress' : 'normal'));
    this._rotateToken();
  }

  // ─── History ──────────────────────────────────────────────────────────────

  private _loadDemoHistory(): void {
    this.accessHistory.set([
      { id: '1', doorLabel: 'Entrada Principal — Lobby', eventType: 'ENTRY', granted: true, isDuress: false, occurredAt: new Date(Date.now() - 5 * 60 * 1000) },
      { id: '2', doorLabel: 'Parqueadero B2 — Acceso Vehículos', eventType: 'EXIT', granted: true, isDuress: false, occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { id: '3', doorLabel: 'Sala de Servidores — Piso 8', eventType: 'DENIED', granted: false, isDuress: false, occurredAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { id: '4', doorLabel: 'Terraza — Piso 12', eventType: 'ENTRY', granted: true, isDuress: false, occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    ]);
  }

  // ─── Visitor Pass ─────────────────────────────────────────────────────────

  issueVisitorPass(): void {
    if (!this.newPass.visitorName.trim()) return;
    const now = new Date();
    const validFrom = this.newPass.validFrom ? new Date(this.newPass.validFrom) : now;
    const validTo = this.newPass.validTo ? new Date(this.newPass.validTo) : new Date(now.getTime() + 8 * 3600 * 1000);
    const passId = Math.random().toString(36).substring(2, 12);
    const record: VisitorPassRecord = {
      id: passId,
      visitorName: this.newPass.visitorName,
      visitorEmail: this.newPass.visitorEmail || undefined,
      validFrom,
      validTo,
      maxUses: this.newPass.maxUses,
      usedCount: 0,
      signedQrToken: `UMBRAL-VP-v1.${passId}.${validFrom.getTime()}.${validTo.getTime()}`,
      shareUrl: `https://access.umbral.io/v/${passId}`,
      status: 'active',
      createdAt: new Date(),
    };
    this.visitorPasses.update((ps) => [record, ...ps]);
    this.newPass = { visitorName: '', visitorEmail: '', validFrom: '', validTo: '', maxUses: 1 };
    this.showNewPassForm.set(false);
  }

  shareViaWhatsApp(pass: VisitorPassRecord): void {
    const msg = encodeURIComponent(
      `Te envío tu pase de acceso UMBRAL.\nVisitante: ${pass.visitorName}\n` +
      `Válido: ${pass.validFrom.toLocaleString('es-CO')} → ${pass.validTo.toLocaleString('es-CO')}\n` +
      `Enlace: ${pass.shareUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  shareViaEmail(pass: VisitorPassRecord): void {
    const subject = encodeURIComponent('Tu Pase de Acceso UMBRAL');
    const body = encodeURIComponent(
      `Hola ${pass.visitorName},\n\nTienes un pase de acceso temporal.\n` +
      `Válido: ${pass.validFrom.toLocaleString('es-CO')} — ${pass.validTo.toLocaleString('es-CO')}\n` +
      `Enlace: ${pass.shareUrl}`
    );
    window.open(`mailto:${pass.visitorEmail ?? ''}?subject=${subject}&body=${body}`, '_blank');
  }

  statusLabel(status: VisitorStatus): string {
    return { active: 'Activo', used: 'Agotado', expired: 'Vencido' }[status];
  }

  // ─── QR Cell Generator ────────────────────────────────────────────────────

  private _randomQrCells(): boolean[] {
    const cells: boolean[] = [];
    for (let i = 0; i < 441; i++) {
      const row = Math.floor(i / 21);
      const col = i % 21;
      const inTopLeft = row < 8 && col < 8;
      const inTopRight = row < 8 && col > 12;
      const inBottomLeft = row > 12 && col < 8;
      if (inTopLeft || inTopRight || inBottomLeft) {
        const r = inTopLeft ? row : row - 13;
        const c = inTopLeft ? col : inTopRight ? col - 13 : col;
        cells.push(r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      } else {
        cells.push(Math.random() > 0.5);
      }
    }
    return cells;
  }
}
