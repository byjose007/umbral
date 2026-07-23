import { Injectable } from '@nestjs/common';
import { SaveMusterSnapshotDto, RecordGuardOverrideLogDto } from './dto/guard-pwa.dto';
import { PseudonymizedAlert, verifyGuardQRTokenOffline } from '@umbral/core';

export interface GuardSyncData {
  readonly siteId: string;
  readonly seedSecret: string;
  readonly crlList: string[];
  readonly occupants: Array<{
    personId: string;
    pseudonym: string;
    fullName: string;
    documentNumber: string;
    zoneId: string;
    status: 'present_inside' | 'evacuated_accounted' | 'missing';
  }>;
}

@Injectable()
export class GuardPwaService {
  private readonly mockCrlList = ['PER-REVOKED-99'];
  private readonly mockSeedSecret = 'secret-key-12345678901234567890';

  private readonly mockOccupants = [
    {
      personId: 'PER-1001',
      pseudonym: 'USR-A9F32',
      fullName: 'Carlos Mendoza',
      documentNumber: '1712345678',
      zoneId: 'ZONE-A-MAIN',
      status: 'present_inside' as const,
    },
    {
      personId: 'PER-1002',
      pseudonym: 'USR-B821C',
      fullName: 'Maria Fernandez',
      documentNumber: '1723456789',
      zoneId: 'ZONE-B-LAB',
      status: 'present_inside' as const,
    },
  ];

  private readonly musterSnapshots: any[] = [];
  private readonly overrideLogs: any[] = [];

  getSyncData(siteId: string): GuardSyncData {
    return {
      siteId,
      seedSecret: this.mockSeedSecret,
      crlList: this.mockCrlList,
      occupants: this.mockOccupants,
    };
  }

  saveMusterSnapshot(dto: SaveMusterSnapshotDto) {
    const id = `muster-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const snapshot = {
      id,
      siteId: dto.siteId,
      initiatedBy: dto.initiatedBy,
      initiatedAt: new Date(),
      occupantsSnapshot: dto.occupantsSnapshot,
      totalInside: dto.occupantsSnapshot.length,
      evacuatedCount: dto.occupantsSnapshot.filter((o) => o.status === 'evacuated_accounted').length,
    };
    this.musterSnapshots.push(snapshot);
    return { success: true, snapshotId: id, snapshot };
  }

  recordOverrideLog(dto: RecordGuardOverrideLogDto) {
    const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const logEntry = {
      id,
      ...dto,
      createdAt: new Date(),
    };
    this.overrideLogs.push(logEntry);
    return { success: true, logId: id, logEntry };
  }

  getActiveAlerts(siteId: string) {
    return [
      {
        alertId: 'ALT-101',
        type: 'FORCED_DOOR',
        severity: 'high',
        personId: 'PER-1001',
        pseudonym: 'USR-A9F32',
        realFullName: 'Carlos Mendoza',
        realDocument: '1712345678',
        zoneId: 'ZONE-A-MAIN',
        timestamp: new Date().toISOString(),
      },
      {
        alertId: 'ALT-102',
        type: 'TAILGATING_SUSPECT',
        severity: 'medium',
        personId: 'PER-1002',
        pseudonym: 'USR-B821C',
        realFullName: 'Maria Fernandez',
        realDocument: '1723456789',
        zoneId: 'ZONE-B-LAB',
        timestamp: new Date().toISOString(),
      },
    ];
  }

  verifyQR(token: string) {
    return verifyGuardQRTokenOffline(token, this.mockSeedSecret, this.mockCrlList);
  }

  getSavedMusterSnapshots() {
    return this.musterSnapshots;
  }

  getSavedOverrideLogs() {
    return this.overrideLogs;
  }
}
