import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonInput,
  IonBadge,
  IonList,
  IonSearchbar,
  IonIcon,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  shieldCheckmark,
  shieldCheckmarkOutline,
  flashOutline,
  cameraOutline,
  keyOutline,
  warningOutline,
  notificationsOutline,
  searchOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  closeCircle,
  closeCircleOutline,
  lockOpenOutline,
  clipboardOutline,
  documentTextOutline,
  saveOutline,
  eyeOutline,
  qrCodeOutline,
  refreshOutline,
  personCircleOutline,
  barcodeOutline,
  logOutOutline,
  chevronDownOutline,
  chevronUpOutline,
  keypadOutline,
  locationOutline,
  timeOutline,
  sunnyOutline,
  moonOutline,
} from 'ionicons/icons';
import {
  verifyGuardQRTokenOffline,
  GuardOfflineVerificationResult,
  MusterRoll,
  PseudonymizedAlert,
} from '@umbral/core';
import { GuardStorageService, GuardSyncCache, OverrideLogRecord } from '../services/guard-storage.service';
import { AuthService } from '../auth/auth.service';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

addIcons({
  'shield-checkmark': shieldCheckmark,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'flash-outline': flashOutline,
  'camera-outline': cameraOutline,
  'key-outline': keyOutline,
  'warning-outline': warningOutline,
  'notifications-outline': notificationsOutline,
  'search-outline': searchOutline,
  'checkmark-circle': checkmarkCircle,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'close-circle': closeCircle,
  'close-circle-outline': closeCircleOutline,
  'lock-open-outline': lockOpenOutline,
  'clipboard-outline': clipboardOutline,
  'document-text-outline': documentTextOutline,
  'save-outline': saveOutline,
  'eye-outline': eyeOutline,
  'qr-code-outline': qrCodeOutline,
  'refresh-outline': refreshOutline,
  'person-circle-outline': personCircleOutline,
  'barcode-outline': barcodeOutline,
  'log-out-outline': logOutOutline,
  'chevron-down-outline': chevronDownOutline,
  'chevron-up-outline': chevronUpOutline,
  'keypad-outline': keypadOutline,
  'location-outline': locationOutline,
  'time-outline': timeOutline,
  'sunny-outline': sunnyOutline,
  'moon-outline': moonOutline,
});

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonInput,
    IonBadge,
    IonList,
    IonSearchbar,
    IonIcon,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  activeTab: 'scanner' | 'contingency' | 'muster' | 'alerts' = 'scanner';

  @ViewChild('videoElement') videoElementRef?: ElementRef<HTMLVideoElement>;
  private mediaStream: MediaStream | null = null;

  // Scanner State
  qrInput = '';
  lastScannedToken = '';
  scanResult: GuardOfflineVerificationResult | null = null;
  offlineFallbackActive = false;
  isCameraActive = false;
  showManualInput = false;
  autoResetCountdown = 0;
  private autoResetTimer: any = null;

  // Buffer para lector óptico / pistola de código de barras por USB/HID
  private hardwareScanBuffer = '';
  private lastKeypressTime = 0;

  // Sync Cache & Local Data
  syncCache: GuardSyncCache = {
    siteId: 'SITE-QUITO-MAIN',
    seedSecret: 'secret-key-12345678901234567890',
    crlList: ['PER-REVOKED-99'],
    occupants: [],
  };

  // Contingency state
  searchQuery = '';
  overrideReason = 'Fallo de red / contingencia en garita principal';
  overrideLogs: OverrideLogRecord[] = [];

  // Muster state
  musterRoll: MusterRoll | null = null;
  musterExportText = '';

  // Alerts state
  alerts: PseudonymizedAlert[] = [];
  unmaskedAlertIds = new Set<string>();

  // Operational UX Enhancements
  currentTimeString = '';
  isDarkMode = false;
  private clockTimer: any = null;

  constructor(
    private storageService: GuardStorageService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.syncCache = this.storageService.getSyncCache();
    this.overrideLogs = this.storageService.getOverrideLogs();
    this.initMusterRoll();
    this.initAlerts();
    this.startLiveClock();
    this.initTheme();
  }

  ngOnDestroy() {
    this.clearAutoResetTimer();
    this.stopCameraStream();
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
  }

  private initTheme() {
    const savedTheme = localStorage.getItem('umbral_guard_theme');
    this.isDarkMode = savedTheme === 'dark';
    this.applyTheme();
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('umbral_guard_theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
    void this.presentToast(this.isDarkMode ? 'Modo Oscuro Activado 🌙' : 'Modo Claro Activado ☀️', 'warning');
  }

  private applyTheme() {
    const theme = this.isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }

  private startLiveClock() {
    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
  }

  private updateClock() {
    const now = new Date();
    this.currentTimeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  /** Control de Cámara Real: Lector Nativo Google MLKit en Android + Fallback WebRTC en PWA */
  async toggleCamera() {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await BarcodeScanner.checkPermissions();
        if (status.camera !== 'granted') {
          const req = await BarcodeScanner.requestPermissions();
          if (req.camera !== 'granted') {
            void this.presentToast('Permiso de cámara denegado en el sistema.', 'danger');
            return;
          }
        }

        // Lector nativo Google MLKit a 60 FPS con aceleración por hardware en Android
        const result = await BarcodeScanner.scan({
          formats: [BarcodeFormat.QrCode],
        });

        if (result.barcodes && result.barcodes.length > 0) {
          const scannedValue = result.barcodes[0].rawValue || result.barcodes[0].displayValue;
          if (scannedValue) {
            this.processScannedToken(scannedValue);
          }
        }
        return;
      } catch (err: any) {
        console.warn('Native BarcodeScanner scan error or cancel:', err);
        if (err?.message?.includes('cancel') || err?.message?.includes('user canceled')) {
          return;
        }
      }
    }

    // NAVEGADOR WEB / PWA
    if (this.isCameraActive) {
      this.isCameraActive = false;
      this.stopCameraStream();
    } else {
      try {
        this.isCameraActive = true;
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment',
          },
        };

        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setTimeout(() => {
          if (this.videoElementRef?.nativeElement) {
            const video = this.videoElementRef.nativeElement;
            video.srcObject = this.mediaStream;
            void video.play().then(() => this.startScanningLoop());
          }
        }, 150);
        void this.presentToast('Cámara activa. Apunte la cámara al código QR', 'success');
      } catch (err: any) {
        console.error('Error al abrir cámara en web:', err);
        try {
          this.isCameraActive = true;
          this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setTimeout(() => {
            if (this.videoElementRef?.nativeElement) {
              const video = this.videoElementRef.nativeElement;
              video.srcObject = this.mediaStream;
              void video.play().then(() => this.startScanningLoop());
            }
          }, 150);
          void this.presentToast('Cámara activa (modo compatible)', 'success');
        } catch (fallbackErr) {
          this.isCameraActive = false;
          this.stopCameraStream();
          void this.presentToast('No se pudo acceder a la cámara. Verifique permisos.', 'danger');
        }
      }
    }
  }

  private scanFrameTimer: any = null;

  private startScanningLoop() {
    this.stopScanningLoop();
    this.scanVideoFrame();
  }

  private stopScanningLoop() {
    if (this.scanFrameTimer) {
      clearTimeout(this.scanFrameTimer);
      this.scanFrameTimer = null;
    }
  }

  private scanVideoFrame() {
    if (!this.isCameraActive || !this.videoElementRef?.nativeElement) return;
    const video = this.videoElementRef.nativeElement;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      if ('BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          detector.detect(video).then((barcodes: any[]) => {
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              const token = barcodes[0].rawValue;
              this.processScannedToken(token);
              this.toggleCamera(); // Cerrar cámara tras lectura exitosa
              return;
            }
          }).catch(() => {});
        } catch (e) {}
      }
    }

    if (this.isCameraActive) {
      this.scanFrameTimer = setTimeout(() => this.scanVideoFrame(), 200);
    }
  }

  private stopCameraStream() {
    this.stopScanningLoop();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.videoElementRef?.nativeElement) {
      this.videoElementRef.nativeElement.srcObject = null;
    }
  }

  /** Captura eventos de teclado globales emitidos por lectores de códigos de barras (HID) */
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Si estamos en la pestaña de escáner y el foco no está en un input manual
    if (this.activeTab !== 'scanner') return;

    const targetElement = event.target as HTMLElement;
    const isInputField = targetElement && (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA');
    if (isInputField) return;

    const currentTime = Date.now();
    // Si han pasado más de 200ms desde la última tecla, reiniciamos el buffer (los escáneres escriben muy rápido)
    if (currentTime - this.lastKeypressTime > 200) {
      this.hardwareScanBuffer = '';
    }
    this.lastKeypressTime = currentTime;

    if (event.key === 'Enter') {
      if (this.hardwareScanBuffer.trim()) {
        this.processScannedToken(this.hardwareScanBuffer.trim());
        this.hardwareScanBuffer = '';
      }
    } else if (event.key.length === 1) {
      this.hardwareScanBuffer += event.key;
    }
  }

  private get currentOperatorId(): string {
    return this.authService.operator()?.id ?? 'UNKNOWN_OPERATOR';
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({ message, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }

  async onLogout(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Cerrar sesión',
      message: '¿Seguro que quieres cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar sesión',
          role: 'destructive',
          handler: async () => {
            await this.authService.logout();
            await this.router.navigateByUrl('/login');
          },
        },
      ],
    });
    await alert.present();
  }

  toggleManualInput() {
    this.showManualInput = !this.showManualInput;
  }

  // Verificación de Token QR
  verifyScannedQR() {
    if (!this.qrInput.trim()) return;
    this.processScannedToken(this.qrInput.trim());
  }

  private async processScannedToken(token: string) {
    this.clearAutoResetTimer();
    this.lastScannedToken = token.trim();

    const realtimeResult = await this.tryVerifyRealtime(this.lastScannedToken);
    this.offlineFallbackActive = !realtimeResult;
    const result: GuardOfflineVerificationResult =
      realtimeResult ?? this.verifyOfflineWithLocalPhoto(this.lastScannedToken);
    this.scanResult = result;

    console.log('[GUARD] Scanned Token:', this.lastScannedToken, 'Result:', result);

    // 1. Guardar log de escaneo en almacenamiento local de la garita
    const personId = result.personId || 'DESCONOCIDO';
    this.storageService.saveScanLog({
      id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      personId,
      token: this.lastScannedToken,
      granted: result.valid,
      reason: result.reason || (result.valid ? 'OK' : 'DENEGADO'),
      scannedAt: new Date().toISOString(),
    });

    // 2. Transmitir evento a la API backend para sincronizar el historial del usuario
    if (result.personId) {
      this.http.post(`${environment.apiBaseUrl}/user-pass/access-event`, {
        personId: result.personId,
        doorLabel: 'Garita Principal',
        eventType: result.valid ? 'ENTRY' : 'DENIED',
        granted: result.valid,
        isDuress: result.diagnostics?.mode === 'duress',
      }).subscribe({
        next: () => console.log('[GUARD] Evento de acceso sincronizado con API'),
        error: (err) => console.warn('[GUARD] Modo Offline — evento en cola local:', err),
      });
    }

    void this.presentToast(
      result.valid ? 'ACCESO PERMITIDO - GARITA' : `ACCESO DENEGADO (${result.reason ?? 'INVALIDO'})`,
      result.valid ? 'success' : 'danger',
    );

    // Iniciar temporizador de auto-reinicio para agilizar filas en garita
    this.startAutoResetTimer(5);
  }

  /**
   * Online-first: intenta validar contra el motor de decisión en tiempo real (mismo doorId/zoneId
   * y anti-passback que usaría un lector de hardware). Si la API no responde en 3s (sin luz/internet
   * o falla el servidor), devuelve null y el llamador cae al HMAC offline local.
   */
  private async tryVerifyRealtime(token: string): Promise<GuardOfflineVerificationResult | null> {
    try {
      const res = await firstValueFrom(
        this.http
          .post<{ valid: boolean; personId?: string; reason?: string; apbViolation?: boolean; photoUrl?: string }>(
            `${environment.apiBaseUrl}/guard/verify-realtime`,
            { token }
          )
          .pipe(timeout(3000))
      );
      return { valid: res.valid, personId: res.personId, reason: res.reason, photoUrl: res.photoUrl };
    } catch (err) {
      console.warn('[GUARD] verify-realtime no disponible, usando fallback offline:', err);
      return null;
    }
  }

  /** Fallback offline: la foto sale del último caché de sincronización local, si está disponible. */
  private verifyOfflineWithLocalPhoto(token: string): GuardOfflineVerificationResult {
    const result = verifyGuardQRTokenOffline(token, this.syncCache.seedSecret, this.syncCache.crlList);
    const occupant = this.syncCache.occupants.find((o) => o.personId === result.personId);
    return occupant?.photoUrl ? { ...result, photoUrl: occupant.photoUrl } : result;
  }

  private startAutoResetTimer(seconds: number) {
    this.autoResetCountdown = seconds;
    this.autoResetTimer = setInterval(() => {
      this.autoResetCountdown--;
      if (this.autoResetCountdown <= 0) {
        this.clearScanResult();
      }
    }, 1000);
  }

  private clearAutoResetTimer() {
    if (this.autoResetTimer) {
      clearInterval(this.autoResetTimer);
      this.autoResetTimer = null;
    }
    this.autoResetCountdown = 0;
  }

  clearScanResult() {
    this.clearAutoResetTimer();
    this.scanResult = null;
    this.qrInput = '';
  }

  async confirmGateOpen() {
    void this.presentToast('Accionando garita principal... Paso libre (5s)', 'success');
    this.clearScanResult();
  }

  // Contingency manual lookup & release
  get filteredOccupants() {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.syncCache.occupants;
    return this.syncCache.occupants.filter(
      (o) =>
        o.fullName.toLowerCase().includes(q) ||
        o.documentNumber.includes(q) ||
        o.personId.toLowerCase().includes(q) ||
        o.pseudonym.toLowerCase().includes(q)
    );
  }

  async releaseGateManually(occupant: any) {
    const alertEl = await this.alertController.create({
      header: 'Liberar garita manualmente',
      message: `Esto abrirá la garita para ${occupant.fullName} y quedará en el registro de auditoría con el motivo indicado. ¿Continuar?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Liberar Garita',
          role: 'destructive',
          handler: () => {
            const log: OverrideLogRecord = {
              id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              guardPersonId: this.currentOperatorId,
              targetPersonId: occupant.personId,
              targetDocument: occupant.documentNumber,
              doorId: 'DOOR-MAIN-GARITA',
              reason: this.overrideReason,
              action: 'manual_contingency_grant',
              createdAt: new Date().toISOString(),
            };
            this.storageService.saveOverrideLog(log);
            this.overrideLogs = this.storageService.getOverrideLogs();
            void this.presentToast(`Garita liberada para ${occupant.fullName}. Auditoría guardada offline.`);
          },
        },
      ],
    });
    await alertEl.present();
  }

  // Muster Roll emergency evacuations
  initMusterRoll() {
    const res = MusterRoll.create({
      sessionId: 'MUST-EVAC-01' as any,
      siteId: this.syncCache.siteId as any,
      initiatedBy: 'Guardia de Garita Principal',
      initiatedAt: new Date(),
      occupants: this.syncCache.occupants.map((o) => ({
        personId: o.personId,
        pseudonym: o.pseudonym,
        fullName: o.fullName,
        zoneId: o.zoneId,
        status: o.status,
      })),
    });

    if (res.isOk()) {
      this.musterRoll = res.value;
    }
  }

  toggleEvacuated(personId: string) {
    if (!this.musterRoll) return;
    const occupant = this.musterRoll.occupants.find((o: any) => o.personId === personId);
    if (!occupant) return;

    if (occupant.status === 'present_inside' || occupant.status === 'missing') {
      const res = this.musterRoll.markEvacuated(personId);
      if (res.isOk()) this.musterRoll = res.value;
    }
  }

  exportMusterCsv() {
    if (!this.musterRoll) return;
    this.musterExportText = this.musterRoll.exportToCsv();
  }

  exportMusterJson() {
    if (!this.musterRoll) return;
    this.musterExportText = this.musterRoll.exportToJson();
  }

  // Pseudonymized alerts LOPDP DP-06
  initAlerts() {
    const a1 = PseudonymizedAlert.create({
      alertId: 'ALT-101',
      type: 'PUERTA_FORZADA',
      severity: 'high',
      personId: 'PER-1001',
      pseudonym: 'USR-A9F32',
      realFullName: 'Carlos Mendoza',
      realDocument: '1712345678',
      zoneId: 'GARITA-NORTE',
      timestamp: new Date(),
    });

    const a2 = PseudonymizedAlert.create({
      alertId: 'ALT-102',
      type: 'TIEMPO_EXCEDIDO',
      severity: 'medium',
      personId: 'PER-1002',
      pseudonym: 'USR-B821C',
      realFullName: 'Maria Fernandez',
      realDocument: '1723456789',
      zoneId: 'LAB-RESERVA',
      timestamp: new Date(),
    });

    if (a1.isOk()) this.alerts.push(a1.value);
    if (a2.isOk()) this.alerts.push(a2.value);
  }

  unmaskAlertIdentity(alertObj: PseudonymizedAlert) {
    const { alert: unmaskedAlert, auditLog } = alertObj.unmaskWithAudit(this.currentOperatorId);
    const idx = this.alerts.findIndex((a) => a.alertId === alertObj.alertId);
    if (idx !== -1) {
      this.alerts[idx] = unmaskedAlert;
      this.unmaskedAlertIds.add(alertObj.alertId);
    }
    const logRecord: OverrideLogRecord = {
      id: auditLog.id,
      guardPersonId: auditLog.guardPersonId,
      targetPersonId: auditLog.targetPersonId,
      doorId: auditLog.doorId,
      reason: auditLog.reason,
      action: auditLog.action,
      createdAt: auditLog.createdAt ? auditLog.createdAt.toISOString() : new Date().toISOString(),
    };
    this.storageService.saveOverrideLog(logRecord);
    this.overrideLogs = this.storageService.getOverrideLogs();
    void this.presentToast('Identidad revelada — consulta registrada en auditoría', 'warning');
  }

  formatAlertType(type: string): string {
    const map: Record<string, string> = {
      PUERTA_FORZADA: 'Puerta Forzada',
      TIEMPO_EXCEDIDO: 'Tiempo Excedido de Permanencia',
      ACCESO_NO_AUTORIZADO: 'Acceso No Autorizado',
    };
    return map[type] || type.replace(/_/g, ' ');
  }
}
