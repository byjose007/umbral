import { Injectable } from '@nestjs/common';
import {
  SaveMusterSnapshotDto,
  RecordGuardOverrideLogDto,
} from './dto/guard-pwa.dto';
import {
  PseudonymizedAlert,
  verifyGuardQRTokenOffline,
  getOfflineDynamicQRTokenDiagnostics,
} from '@umbral/core';
import { TopologyService } from '../topology/topology.service';
import { AccessMatrixCompilerService } from '../access-matrix/access-matrix-compiler.service';
import { DecisionService } from '../decision/decision.service';
import { IdentityService } from '../identity/identity.service';

export interface GuardRealtimeVerificationResult {
  readonly valid: boolean;
  readonly personId?: string;
  readonly reason?: string;
  readonly apbViolation?: boolean;
  readonly photoUrl?: string;
}

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

  constructor(
    private readonly topologyService: TopologyService,
    private readonly accessMatrixCompilerService: AccessMatrixCompilerService,
    private readonly decisionService: DecisionService,
    private readonly identityService: IdentityService,
  ) {}

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

  getSyncData(siteId: string, organizationId: string): GuardSyncData {
    return {
      siteId,
      seedSecret: this.resolveSeedSecret(organizationId),
      crlList: this.mockCrlList,
      occupants: this.mockOccupants,
    };
  }

  /** Resolves the calling operator's organization seedSecret — never a global/shared one. */
  private resolveSeedSecret(organizationId: string): string {
    return this.topologyService.getOrganizationById(organizationId).seedSecret;
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
      evacuatedCount: dto.occupantsSnapshot.filter(
        (o) => o.status === 'evacuated_accounted',
      ).length,
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

  verifyQR(token: string, organizationId: string) {
    return verifyGuardQRTokenOffline(
      token,
      this.resolveSeedSecret(organizationId),
      this.mockCrlList,
    );
  }

  /**
   * Real-time verification: the guard-pwa acts as just another Reader against the same
   * evaluateAccess/evaluateAPB engine a hardware reader would use — same doorId/zoneId, same
   * shared anti-passback state (owned by DecisionService). Falls back to verifyQR/offline
   * decoding client-side only when this call itself is unreachable (handled by the Angular app).
   */
  verifyRealtime(
    token: string,
    assignedReaderId: string | null | undefined,
    organizationId: string,
    now: Date = new Date(),
  ): GuardRealtimeVerificationResult {
    const seedSecret = this.resolveSeedSecret(organizationId);
    const diag = getOfflineDynamicQRTokenDiagnostics(token, seedSecret, now);
    if (!diag.isValidSig) {
      return { valid: false, personId: diag.personId, reason: diag.reason };
    }

    // Best-effort: shown so the guard can visually match the person against who's standing
    // there, regardless of whether the access decision below ends up granting or denying.
    const photoUrl = this.lookupPhotoUrl(diag.personId);

    if (!assignedReaderId) {
      return {
        valid: false,
        personId: diag.personId,
        reason: 'NO_ASSIGNED_CHECKPOINT (operador sin garita asignada)',
        photoUrl,
      };
    }

    const reader = this.topologyService.getReaderById(assignedReaderId);
    const door = this.topologyService.getDoorById(reader.doorId);
    const zone = this.topologyService.getZoneById(door.zoneInsideId);

    const compiled = this.accessMatrixCompilerService.compileForPerson(diag.personId, now);
    if (!compiled.ok) {
      return { valid: false, personId: diag.personId, reason: compiled.reasonCode, photoUrl };
    }

    const evaluation = this.decisionService.evaluate({
      credentialHash: compiled.credentialHash,
      doorId: door.id,
      readerId: reader.id,
      at: now.toISOString(),
      localState: {
        matrix: compiled.matrix,
        offlineMode: 'cached',
        isOffline: false,
        apbMode: zone.apbMode,
        apbResetSec: zone.apbResetSec ?? undefined,
      },
      readerZoneInsideId: door.zoneInsideId,
    } as Parameters<DecisionService['evaluate']>[0]);

    const { decision } = evaluation;
    return {
      valid: decision.kind === 'granted',
      personId: diag.personId,
      reason: decision.reasonCode,
      apbViolation: decision.kind === 'granted' ? decision.apbViolation ?? false : false,
      photoUrl,
    };
  }

  private lookupPhotoUrl(personId: string): string | undefined {
    try {
      return this.identityService.getPersonById(personId).photoUrl ?? undefined;
    } catch {
      return undefined;
    }
  }

  getSavedMusterSnapshots() {
    return this.musterSnapshots;
  }

  getSavedOverrideLogs() {
    return this.overrideLogs;
  }
}
