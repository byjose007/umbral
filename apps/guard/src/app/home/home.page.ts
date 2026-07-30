import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  shieldCheckmarkOutline,
  flashOutline,
  cameraOutline,
  keyOutline,
  warningOutline,
  notificationsOutline,
  searchOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  lockOpenOutline,
  clipboardOutline,
  documentTextOutline,
  saveOutline,
  eyeOutline,
} from 'ionicons/icons';
import {
  verifyGuardQRTokenOffline,
  MusterRoll,
  PseudonymizedAlert,
  generateOfflineDynamicQRToken,
} from '@umbral/core';
import { GuardStorageService, GuardSyncCache, OverrideLogRecord } from '../services/guard-storage.service';
import { AuthService } from '../auth/auth.service';

addIcons({
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'flash-outline': flashOutline,
  'camera-outline': cameraOutline,
  'key-outline': keyOutline,
  'warning-outline': warningOutline,
  'notifications-outline': notificationsOutline,
  'search-outline': searchOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'close-circle-outline': closeCircleOutline,
  'lock-open-outline': lockOpenOutline,
  'clipboard-outline': clipboardOutline,
  'document-text-outline': documentTextOutline,
  'save-outline': saveOutline,
  'eye-outline': eyeOutline,
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
  ],
})
export class HomePage implements OnInit {
  activeTab: 'scanner' | 'contingency' | 'muster' | 'alerts' = 'scanner';

  // Scanner state
  qrInput = '';
  scanResult: { valid: boolean; personId?: string; reason?: string } | null = null;

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

  constructor(
    private storageService: GuardStorageService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
  ) {}

  ngOnInit() {
    this.syncCache = this.storageService.getSyncCache();
    this.overrideLogs = this.storageService.getOverrideLogs();
    this.initMusterRoll();
    this.initAlerts();
  }

  /** Falls back to a generic id only if guarded routes were somehow bypassed. */
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

  // Generate mock valid token for demo scanning
  generateDemoToken() {
    const res = generateOfflineDynamicQRToken(this.syncCache.seedSecret, 'PER-1001');
    this.qrInput = res.token;
  }

  generateRevokedDemoToken() {
    const res = generateOfflineDynamicQRToken(this.syncCache.seedSecret, 'PER-REVOKED-99');
    this.qrInput = res.token;
  }

  verifyScannedQR() {
    if (!this.qrInput.trim()) return;
    this.scanResult = verifyGuardQRTokenOffline(
      this.qrInput.trim(),
      this.syncCache.seedSecret,
      this.syncCache.crlList
    );
    void this.presentToast(
      this.scanResult.valid ? 'Acceso autorizado' : 'Acceso denegado',
      this.scanResult.valid ? 'success' : 'danger',
    );
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
          text: 'Liberar',
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
}
