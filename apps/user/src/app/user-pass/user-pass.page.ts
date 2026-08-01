import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import QRCode from 'qrcode';
import { generateOfflineDynamicQRToken } from '@umbral/core';
import { AppTab, PassMode, VisitorStatus, AccessHistoryEntry, VisitorPassRecord } from '../core/models/user-pass.models';

// Modular Feature Components
import { AppHeaderComponent } from '../shared/components/app-header/app-header.component';
import { BottomNavComponent } from '../shared/components/bottom-nav/bottom-nav.component';
import { PinPadComponent } from '../features/auth/pin-pad/pin-pad.component';
import { PassCardComponent } from '../features/pass/components/pass-card/pass-card.component';
import { DuressToggleComponent } from '../features/pass/components/duress-toggle/duress-toggle.component';
import { HistoryViewComponent } from '../features/history/history-view.component';
import { VisitorsViewComponent } from '../features/visitors/visitors-view.component';

@Component({
  selector: 'app-user-pass',
  standalone: true,
  imports: [
    CommonModule,
    AppHeaderComponent,
    BottomNavComponent,
    PinPadComponent,
    PassCardComponent,
    DuressToggleComponent,
    HistoryViewComponent,
    VisitorsViewComponent,
  ],
  template: `
    <div class="user-app-shell" [class.duress-mode]="passMode() === 'duress'">
      <!-- 1. LOGIN / ACTIVATION GATE -->
      @if (!isAuthenticated()) {
        <app-pin-pad
          [authMode]="authMode()"
          [error]="loginError()"
          [isVerifying]="isVerifyingPin()"
          [pinDots]="pinDots()"
          [activationDots]="activationDots()"
          (digitEntered)="onPinDigit($event)"
          (cleared)="clearPin()"
          (modeChange)="switchToMode($event)"
        ></app-pin-pad>
      }

      <!-- 2. MAIN APPLICATION -->
      @if (isAuthenticated()) {
        <!-- App Header Bar -->
        <app-header
          [userName]="currentUser().name"
          [userDepartment]="currentUser().department"
          [initials]="userInitials()"
          [isOnline]="isOnline()"
          (logoutRequested)="logout()"
        ></app-header>

        <!-- Tab Content -->
        <main class="main-content">
          <!-- TAB: MI PASE -->
          @if (activeTab() === 'pass') {
            <section class="pass-tab-wrapper">
              <app-pass-card
                [userName]="currentUser().name"
                [userDept]="currentUser().department"
                [passMode]="passMode()"
                [currentToken]="currentToken()"
                [tokenPreview]="tokenPreview()"
                [qrDataUrl]="qrDataUrl()"
                [secondsLeft]="secondsLeft()"
                [ringDashOffset]="ringDashOffset()"
                [currentTimeDisplay]="currentTimeDisplay()"
                [isRotating]="isRotating()"
                [isOnline]="isOnline()"
                [qrCells]="qrCells()"
              ></app-pass-card>

              <app-duress-toggle
                [passMode]="passMode()"
                (toggleRequested)="toggleDuress()"
              ></app-duress-toggle>
            </section>
          }

          <!-- TAB: HISTORIAL -->
          @if (activeTab() === 'history') {
            <app-history-view
              [history]="accessHistory()"
            ></app-history-view>
          }

          <!-- TAB: VISITAS -->
          @if (activeTab() === 'visitors') {
            <app-visitors-view
              [passes]="filteredVisitorPasses()"
              [selectedFilter]="visitorPassFilter()"
              [showForm]="showNewPassForm()"
              [newPass]="newPass"
              (filterChanged)="visitorPassFilter.set($event)"
              (formToggled)="showNewPassForm.set($event)"
              (issuePassRequested)="issueVisitorPass()"
              (shareWhatsApp)="shareViaWhatsApp($event)"
              (shareEmail)="shareViaEmail($event)"
            ></app-visitors-view>
          }
        </main>

        <!-- Ergonomic Bottom Navigation -->
        <app-bottom-nav
          [activeTab]="activeTab()"
          (tabSelected)="setTab($event)"
        ></app-bottom-nav>
      }
    </div>
  `,
  styles: [`
    .user-app-shell {
      min-height: 100vh;
      background: var(--umbral-bg, #0f1115);
      color: var(--umbral-text, #e6e8ec);
      font-family: var(--umbral-font-sans);
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .user-app-shell.duress-mode {
      background: linear-gradient(180deg, #240d0e 0%, var(--umbral-bg, #0f1115) 100%);
    }

    .main-content {
      flex: 1;
      overflow-y: auto;
      padding-bottom: 80px;
    }

    .pass-tab-wrapper {
      padding: 1.25rem 1rem 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }
  `],
})
export class UserPassPage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly PERSON_ID = 'person-demo-001';

  // ─── Auth Signals ──────────────────────────────────────────────────────────
  isAuthenticated = signal(false);
  loginError = signal<string | null>(null);
  isVerifyingPin = signal(false);
  authMode = signal<'login' | 'activation' | 'set-pin'>('login');
  pendingActivationCode = '';

  currentUser = signal({
    id: this.PERSON_ID,
    name: 'Byron José López',
    department: 'Tecnología · Piso 4',
  });

  userInitials = computed(() => {
    const parts = this.currentUser().name.split(' ');
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  });

  private pinValue = '';
  private activationValue = '';
  pinDots = signal([false, false, false, false]);
  activationDots = signal([false, false, false, false, false, false]);

  // ─── Navigation Signals ───────────────────────────────────────────────────
  activeTab = signal<AppTab>('pass');
  isOnline = signal(navigator.onLine);

  // ─── QR Signals ───────────────────────────────────────────────────────────
  passMode = signal<PassMode>('normal');
  currentToken = signal('');
  qrDataUrl = signal<string>('');
  secondsLeft = signal(30);
  isRotating = signal(false);
  currentTimeDisplay = signal(new Date().toISOString().substring(11, 23));
  qrCells = signal<boolean[]>(this._randomQrCells());

  tokenPreview = computed(() => {
    const t = this.currentToken();
    return t ? t.substring(0, 34) + '…' : 'Generando…';
  });

  ringDashOffset = computed(() => {
    const circumference = 169.6;
    return circumference - (this.secondsLeft() / 30) * circumference;
  });

  private _timer?: ReturnType<typeof setInterval>;
  private _clockTimer?: ReturnType<typeof setInterval>;
  private _onlineHandler = () => this.isOnline.set(true);
  private _offlineHandler = () => this.isOnline.set(false);

  // ─── Visitors & History Signals ───────────────────────────────────────────
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

  // ─── Auth Handlers ────────────────────────────────────────────────────────
  switchToMode(mode: 'login' | 'activation' | 'set-pin'): void {
    this.authMode.set(mode);
    this.loginError.set(null);
    this.pinValue = '';
    this.activationValue = '';
    this.pinDots.set([false, false, false, false]);
    this.activationDots.set([false, false, false, false, false, false]);
  }

  onPinDigit(n: number): void {
    if (this.isVerifyingPin()) return;

    if (this.authMode() === 'activation') {
      if (this.activationValue.length >= 6) return;
      this.activationValue += n.toString();
      this.activationDots.set([false, false, false, false, false, false].map((_, i) => i < this.activationValue.length));
      if (this.activationValue.length === 6) {
        setTimeout(() => this.submitActivationCode(), 150);
      }
    } else {
      if (this.pinValue.length >= 4) return;
      this.pinValue += n.toString();
      this.pinDots.set([false, false, false, false].map((_, i) => i < this.pinValue.length));
      if (this.pinValue.length === 4) setTimeout(() => this._checkPin(), 200);
    }
  }

  clearPin(): void {
    if (this.isVerifyingPin()) return;

    if (this.authMode() === 'activation') {
      this.activationValue = this.activationValue.slice(0, -1);
      this.activationDots.set([false, false, false, false, false, false].map((_, i) => i < this.activationValue.length));
    } else {
      this.pinValue = this.pinValue.slice(0, -1);
      this.pinDots.set([false, false, false, false].map((_, i) => i < this.pinValue.length));
    }
  }

  submitActivationCode(): void {
    if (this.activationValue.length !== 6) return;
    this.pendingActivationCode = this.activationValue;
    this.authMode.set('set-pin');
    this.loginError.set(null);
    this.pinValue = '';
    this.pinDots.set([false, false, false, false]);
  }

  private async _checkPin(): Promise<void> {
    this.isVerifyingPin.set(true);
    this.loginError.set(null);

    try {
      const pinHash = await this._hashPin(this.pinValue);

      if (this.authMode() === 'set-pin') {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/user-pass/enroll`, {
            personId: this.PERSON_ID,
            activationCode: this.pendingActivationCode,
            pinHash,
          }),
        );
        this.authMode.set('login');
        this._onLoginSuccess();
      } else {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/user-pass/login`, {
            personId: this.PERSON_ID,
            pinHash,
          }),
        );
        this._onLoginSuccess();
      }
    } catch (err: any) {
      const errorMsg = err?.error?.message ?? 'PIN incorrecto. Intenta de nuevo.';
      this.loginError.set(errorMsg);
      this.pinValue = '';
      this.pinDots.set([false, false, false, false]);

      if (
        errorMsg.includes('activación') ||
        errorMsg.includes('no activado') ||
        errorMsg.includes('revocado')
      ) {
        this.authMode.set('activation');
      }
    } finally {
      this.isVerifyingPin.set(false);
    }
  }

  private async _hashPin(pin: string): Promise<string> {
    const data = new TextEncoder().encode(pin);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private _onLoginSuccess(): void {
    this.isAuthenticated.set(true);
    void this._loadHistory();
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

  setTab(tab: AppTab): void {
    this.activeTab.set(tab);
    if (tab === 'history') {
      void this._loadHistory();
    }
  }

  // ─── QR Generator Handlers ────────────────────────────────────────────────
  private async _generateToken(): Promise<void> {
    const personId = this.currentUser().id;
    const mode = this.passMode();
    const seedSecret = 'secret-key-12345678901234567890'; // Clave criptográfica compartida con garita

    const tokenRes = generateOfflineDynamicQRToken(seedSecret, personId, new Date(), mode, 30);
    const token = tokenRes.token;

    this.currentToken.set(token);
    this.qrCells.set(this._randomQrCells());

    try {
      const url = await QRCode.toDataURL(token, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 320,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      this.qrDataUrl.set(url);
    } catch (err) {
      console.error('Error generating QR image:', err);
    }
  }

  private _startQrRotation(): void {
    this._generateToken();
    const secondsInBucket = Math.floor(Date.now() / 1000) % 30;
    this.secondsLeft.set(30 - secondsInBucket);

    this._timer = setInterval(() => {
      this.secondsLeft.update((s) => {
        if (s <= 1) {
          this._rotateToken();
          return 30;
        }
        return s - 1;
      });
    }, 1000);
  }

  private _rotateToken(): void {
    this.isRotating.set(true);
    setTimeout(() => {
      this._generateToken();
      this.isRotating.set(false);
    }, 300);
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

  // ─── Demo Data & Real API History ──────────────────────────────────────────
  private async _loadHistory(): Promise<void> {
    try {
      const history = await firstValueFrom(
        this.http.get<AccessHistoryEntry[]>(`${environment.apiUrl}/user-pass/history/${this.PERSON_ID}`)
      );
      if (Array.isArray(history)) {
        this.accessHistory.set(
          history.map((item) => ({
            ...item,
            occurredAt: new Date(item.occurredAt),
          }))
        );
        return;
      }
    } catch (err) {
      console.warn('[USER-PASS] Fallback a historial local:', err);
    }
    this._loadDemoHistory();
  }

  private _loadDemoHistory(): void {
    this.accessHistory.set([
      { id: '1', doorLabel: 'Entrada Principal — Lobby', eventType: 'ENTRY', granted: true, isDuress: false, occurredAt: new Date(Date.now() - 5 * 60 * 1000) },
      { id: '2', doorLabel: 'Parqueadero B2 — Acceso Vehículos', eventType: 'EXIT', granted: true, isDuress: false, occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { id: '3', doorLabel: 'Sala de Servidores — Piso 8', eventType: 'DENIED', granted: false, isDuress: false, occurredAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { id: '4', doorLabel: 'Terraza — Piso 12', eventType: 'ENTRY', granted: true, isDuress: false, occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    ]);
  }

  // ─── Visitor Passes Handlers ──────────────────────────────────────────────
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
