import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { HomePage } from './home.page';
import { GuardStorageService } from '../services/guard-storage.service';

describe('Guard PWA HomePage Component', () => {
  let component: HomePage;
  let storageService: GuardStorageService;

  beforeEach(() => {
    storageService = new GuardStorageService();
    component = new HomePage(storageService);
    component.ngOnInit();
  });

  it('should create and initialize default state', () => {
    expect(component).toBeTruthy();
    expect(component.activeTab).toBe('scanner');
    expect(component.syncCache.siteId).toBeDefined();
    expect(component.alerts.length).toBe(2);
  });

  it('should verify scanned QR token offline', () => {
    component.generateDemoToken();
    expect(component.qrInput).toContain('UMBRAL-PASS-v1.');

    component.verifyScannedQR();
    expect(component.scanResult).not.toBeNull();
    expect(component.scanResult?.valid).toBe(true);
    expect(component.scanResult?.personId).toBe('PER-1001');
  });

  it('should reject revoked QR token in offline CRL', () => {
    component.generateRevokedDemoToken();
    component.verifyScannedQR();

    expect(component.scanResult?.valid).toBe(false);
    expect(component.scanResult?.reason).toBe('REVOKED_IN_CRL');
  });

  it('should export MusterRoll to CSV and JSON', () => {
    expect(component.musterRoll).not.toBeNull();

    component.exportMusterCsv();
    expect(component.musterExportText).toContain('PersonId,Pseudonym,FullName,ZoneId,Status');

    component.exportMusterJson();
    expect(component.musterExportText).toContain('"sessionId": "MUST-EVAC-01"');
  });

  it('should unmask alert identity and log audit record under LOPDP DP-06', () => {
    const targetAlert = component.alerts[0]!;
    expect(targetAlert.getDisplayName()).toBe('USR-A9F32');

    component.unmaskAlertIdentity(targetAlert);
    expect(component.alerts[0]!.getDisplayName()).toBe('Carlos Mendoza');
    expect(component.overrideLogs.length).toBeGreaterThan(0);
    expect(component.overrideLogs[component.overrideLogs.length - 1]!.action).toBe('identity_unmask_audit');
  });
});
