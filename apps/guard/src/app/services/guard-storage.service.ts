import { Injectable } from '@angular/core';

export interface GuardSyncCache {
  siteId: string;
  seedSecret: string;
  crlList: string[];
  occupants: Array<{
    personId: string;
    pseudonym: string;
    fullName: string;
    documentNumber: string;
    zoneId: string;
    status: 'present_inside' | 'evacuated_accounted' | 'missing';
    photoUrl?: string;
  }>;
}

export interface OverrideLogRecord {
  id: string;
  guardPersonId: string;
  targetPersonId?: string;
  targetDocument?: string;
  doorId: string;
  reason: string;
  action: 'manual_contingency_grant' | 'manual_contingency_deny' | 'identity_unmask_audit';
  createdAt: string;
}

export interface GuardScanLogRecord {
  id: string;
  personId: string;
  token: string;
  granted: boolean;
  reason: string;
  scannedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class GuardStorageService {
  private readonly CACHE_KEY = 'umbral_guard_sync_cache';
  private readonly OVERRIDE_LOGS_KEY = 'umbral_guard_override_logs';
  private readonly SCAN_LOGS_KEY = 'umbral_guard_scan_logs';

  saveSyncCache(cache: GuardSyncCache): void {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }

  getSyncCache(): GuardSyncCache {
    const raw = localStorage.getItem(this.CACHE_KEY);
    if (!raw) {
      return {
        siteId: 'SITE-QUITO-MAIN',
        seedSecret: 'secret-key-12345678901234567890',
        crlList: ['PER-REVOKED-99'],
        occupants: [
          {
            personId: 'PER-1001',
            pseudonym: 'USR-A9F32',
            fullName: 'Carlos Mendoza',
            documentNumber: '1712345678',
            zoneId: 'ZONE-A-MAIN',
            status: 'present_inside',
          },
          {
            personId: 'PER-1002',
            pseudonym: 'USR-B821C',
            fullName: 'Maria Fernandez',
            documentNumber: '1723456789',
            zoneId: 'ZONE-B-LAB',
            status: 'present_inside',
          },
        ],
      };
    }
    return JSON.parse(raw);
  }

  saveOverrideLog(log: OverrideLogRecord): void {
    const logs = this.getOverrideLogs();
    logs.push(log);
    localStorage.setItem(this.OVERRIDE_LOGS_KEY, JSON.stringify(logs));
  }

  getOverrideLogs(): OverrideLogRecord[] {
    const raw = localStorage.getItem(this.OVERRIDE_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  saveScanLog(log: GuardScanLogRecord): void {
    const logs = this.getScanLogs();
    logs.unshift(log);
    localStorage.setItem(this.SCAN_LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
  }

  getScanLogs(): GuardScanLogRecord[] {
    const raw = localStorage.getItem(this.SCAN_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  }
}
