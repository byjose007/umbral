import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  generateUserPassToken,
  verifyUserPassToken,
  generateVisitorPassToken,
  type TokenMode,
} from '@umbral/core';
import { v4 as uuidv4 } from './uuid.js';
import type {
  LoginUserPassDto,
  IssueVisitorPassDto,
  GetUserAccessHistoryDto,
  GetVisitorPassesDto,
  VerifyUserPassTokenDto,
  RecordVisitorPassUseDto,
} from './dto/user-pass.dto.js';

// ─── In-Memory Stores (mirrors device-gateway pattern for MVP) ───────────────

interface SeedRecord {
  id: string;
  personId: string;
  pinHash: string;
  seedSecret: string;
  encryptedSeed: string;
  salt: string;
  status: 'active' | 'revoked';
  issuedAt: Date;
}

export interface ActivationCodeRecord {
  personId: string;
  code: string;
  expiresAt: Date;
  used: boolean;
}

export interface AccessHistoryEntry {
  id: string;
  personId: string;
  doorLabel: string;
  eventType: 'ENTRY' | 'EXIT' | 'DENIED' | 'DURESS';
  granted: boolean;
  isDuress: boolean;
  occurredAt: Date;
}

export interface VisitorPassRecord {
  id: string;
  issuerPersonId: string;
  visitorName: string;
  visitorEmail?: string;
  validFrom: Date;
  validTo: Date;
  maxUses: number;
  usedCount: number;
  signedQrToken: string;
  shareUrl?: string;
  status: 'active' | 'used' | 'expired';
  createdAt: Date;
}

@Injectable()
export class UserPassService {
  private readonly seedStore = new Map<string, SeedRecord>(); // personId → SeedRecord
  private readonly activationCodeStore = new Map<string, ActivationCodeRecord>(); // personId → ActivationCodeRecord
  private readonly historyStore = new Map<string, AccessHistoryEntry[]>(); // personId → entries
  private readonly visitorPassStore = new Map<string, VisitorPassRecord>(); // id → record

  constructor() {
    // Pre-provision a default activation code for the demo user ('person-demo-001')
    this.activationCodeStore.set('person-demo-001', {
      personId: 'person-demo-001',
      code: '123456',
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      used: false,
    });

    // Pre-provision initial access history for demo user ('person-demo-001')
    this.historyStore.set('person-demo-001', [
      { id: '4', personId: 'person-demo-001', doorLabel: 'Terraza — Piso 12', eventType: 'ENTRY', granted: true, isDuress: false, occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { id: '3', personId: 'person-demo-001', doorLabel: 'Sala de Servidores — Piso 8', eventType: 'DENIED', granted: false, isDuress: false, occurredAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { id: '2', personId: 'person-demo-001', doorLabel: 'Parqueadero B2 — Acceso Vehículos', eventType: 'EXIT', granted: true, isDuress: false, occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { id: '1', personId: 'person-demo-001', doorLabel: 'Entrada Principal — Lobby', eventType: 'ENTRY', granted: true, isDuress: false, occurredAt: new Date(Date.now() - 5 * 60 * 1000) },
    ]);
  }

  // ─── Authentication, Enrollment & Seed Provisioning ──────────────────────

  /**
   * Generates a 6-digit activation code for a given person (admin endpoint).
   */
  generateActivationCode(personId: string): {
    personId: string;
    activationCode: string;
    expiresAt: Date;
  } {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24h validity
    const record: ActivationCodeRecord = { personId, code, expiresAt, used: false };
    this.activationCodeStore.set(personId, record);
    return { personId, activationCode: code, expiresAt };
  }

  /**
   * Enrolls a person's User Pass using a valid 6-digit activation code and sets their 4-digit PIN.
   */
  enroll(dto: { personId: string; activationCode: string; pinHash: string }): {
    seedSecret: string;
    encryptedSeed: string;
    salt: string;
  } {
    const activation = this.activationCodeStore.get(dto.personId);

    if (
      !activation ||
      activation.code !== dto.activationCode ||
      activation.used ||
      activation.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException(
        'Código de activación inválido, expirado o ya utilizado.',
      );
    }

    activation.used = true;

    const seedSecret = `UMBRAL-SEED-${uuidv4()}`;
    const salt = `SALT-${uuidv4()}`;
    const record: SeedRecord = {
      id: uuidv4(),
      personId: dto.personId,
      pinHash: dto.pinHash,
      seedSecret,
      encryptedSeed: `ENC::${seedSecret}`,
      salt,
      status: 'active',
      issuedAt: new Date(),
    };

    this.seedStore.set(dto.personId, record);

    return {
      seedSecret: record.seedSecret,
      encryptedSeed: record.encryptedSeed,
      salt: record.salt,
    };
  }

  /**
   * Revokes an active User Pass seed and generates a fresh activation code for re-enrollment.
   */
  revoke(personId: string): {
    personId: string;
    status: 'revoked';
    newActivationCode: string;
  } {
    const existing = this.seedStore.get(personId);
    if (existing) {
      existing.status = 'revoked';
    }

    const { activationCode } = this.generateActivationCode(personId);
    return { personId, status: 'revoked', newActivationCode: activationCode };
  }

  /**
   * Authenticates a user with their PIN. Device must already be enrolled.
   */
  login(dto: LoginUserPassDto): {
    seedSecret: string;
    encryptedSeed: string;
    salt: string;
  } {
    if (!dto.personId || !dto.pinHash) {
      throw new UnauthorizedException('personId and pinHash are required');
    }

    const existing = this.seedStore.get(dto.personId);

    if (!existing) {
      throw new UnauthorizedException(
        'Dispositivo no activado. Se requiere enrolamiento con código de activación de 6 dígitos.',
      );
    }

    if (existing.status !== 'active') {
      throw new UnauthorizedException(
        'El pase de acceso fue revocado. Se requiere un nuevo código de activación.',
      );
    }

    if (existing.pinHash !== dto.pinHash) {
      throw new UnauthorizedException('PIN incorrecto');
    }

    return {
      seedSecret: existing.seedSecret,
      encryptedSeed: existing.encryptedSeed,
      salt: existing.salt,
    };
  }


  /**
   * Returns the current pass seed for a person (used by the PWA to refresh the cached seed).
   */
  getSeed(personId: string): {
    seedSecret: string;
    encryptedSeed: string;
    salt: string;
  } {
    const record = this.seedStore.get(personId);
    if (!record || record.status !== 'active') {
      throw new NotFoundException(
        `No active pass seed found for person ${personId}`,
      );
    }
    return {
      seedSecret: record.seedSecret,
      encryptedSeed: record.encryptedSeed,
      salt: record.salt,
    };
  }

  // ─── Token Verification ───────────────────────────────────────────────────

  /**
   * Server-side verification of a scanned QR token.
   * Returns whether the token is valid and whether it's a duress token.
   */
  verifyToken(dto: VerifyUserPassTokenDto): {
    valid: boolean;
    mode?: TokenMode;
    personId: string;
  } {
    const record = this.seedStore.get(dto.personId);
    if (!record || record.status !== 'active') {
      throw new NotFoundException(
        `No active pass seed for person ${dto.personId}`,
      );
    }

    const result = verifyUserPassToken(dto.token, record.seedSecret);

    // If duress, record a history entry
    if (result.valid && result.mode === 'duress') {
      this._appendHistory(dto.personId, {
        doorLabel: 'DURESS_SCAN',
        eventType: 'DURESS',
        granted: true,
        isDuress: true,
      });
    }

    return { ...result, personId: dto.personId };
  }

  // ─── Access History ────────────────────────────────────────────────────────

  /**
   * Returns the personal access history for a given person.
   * The result is ordered by most recent first.
   */
  getAccessHistory(dto: GetUserAccessHistoryDto): AccessHistoryEntry[] {
    const limit = dto.limit ?? 20;
    const entries = this.historyStore.get(dto.personId) ?? [];
    return entries.slice(-limit).reverse();
  }

  /**
   * Records a door access event for a person.
   * Called by the device-gateway or decision engine after each scan.
   */
  recordAccessEvent(
    personId: string,
    doorLabel: string,
    eventType: 'ENTRY' | 'EXIT' | 'DENIED' | 'DURESS',
    granted: boolean,
    isDuress = false,
  ): void {
    this._appendHistory(personId, { doorLabel, eventType, granted, isDuress });
  }

  // ─── Visitor Pass Issuance ────────────────────────────────────────────────

  /**
   * Issues a new visitor guest pass and returns the signed QR token with share URL.
   */
  issueVisitorPass(dto: IssueVisitorPassDto): VisitorPassRecord {
    const validFrom = new Date(dto.validFrom);
    const validTo = new Date(dto.validTo);

    if (isNaN(validFrom.getTime()) || isNaN(validTo.getTime())) {
      throw new BadRequestException(
        'validFrom and validTo must be valid ISO 8601 date strings',
      );
    }

    if (validTo <= validFrom) {
      throw new BadRequestException('validTo must be after validFrom');
    }

    if (validTo <= new Date()) {
      throw new BadRequestException(
        'Visitor pass cannot be issued with a past validTo date',
      );
    }

    const passId = uuidv4();
    const maxUses = dto.maxUses ?? 1;

    // Retrieve issuer seed for signing
    const seedRecord = this.seedStore.get(dto.issuerPersonId);
    const seedSecret =
      seedRecord?.seedSecret ?? `UMBRAL-VISITOR-SEED-${dto.issuerPersonId}`;

    const { token } = generateVisitorPassToken(
      seedSecret,
      passId,
      validFrom,
      validTo,
      maxUses,
    );

    const record: VisitorPassRecord = {
      id: passId,
      issuerPersonId: dto.issuerPersonId,
      visitorName: dto.visitorName,
      visitorEmail: dto.visitorEmail,
      validFrom,
      validTo,
      maxUses,
      usedCount: 0,
      signedQrToken: token,
      shareUrl: `https://access.umbral.io/v/${passId}`,
      status: 'active',
      createdAt: new Date(),
    };

    this.visitorPassStore.set(passId, record);
    return record;
  }

  /**
   * Returns visitor passes issued by a person, optionally filtered by status.
   */
  getVisitorPasses(dto: GetVisitorPassesDto): VisitorPassRecord[] {
    const results: VisitorPassRecord[] = [];

    for (const record of this.visitorPassStore.values()) {
      if (record.issuerPersonId !== dto.issuerPersonId) continue;

      // Update derived status
      const now = new Date();
      if (record.validTo < now && record.status === 'active') {
        record.status = 'expired';
      }
      if (record.usedCount >= record.maxUses && record.status === 'active') {
        record.status = 'used';
      }

      if (!dto.status || record.status === dto.status) {
        results.push(record);
      }
    }

    return results.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /**
   * Records a use of a visitor pass.
   */
  recordVisitorPassUse(dto: RecordVisitorPassUseDto): {
    remainingUses: number;
    status: string;
  } {
    const record = this.visitorPassStore.get(dto.visitorPassId);
    if (!record) {
      throw new NotFoundException(
        `Visitor pass ${dto.visitorPassId} not found`,
      );
    }

    const now = new Date();
    if (record.validTo < now) {
      throw new BadRequestException('This visitor pass has expired');
    }
    if (record.usedCount >= record.maxUses) {
      throw new BadRequestException(
        'This visitor pass has reached its maximum uses',
      );
    }

    record.usedCount += 1;
    if (record.usedCount >= record.maxUses) {
      record.status = 'used';
    }

    return {
      remainingUses: record.maxUses - record.usedCount,
      status: record.status,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private _appendHistory(
    personId: string,
    entry: Omit<AccessHistoryEntry, 'id' | 'personId' | 'occurredAt'>,
  ): void {
    const list = this.historyStore.get(personId) ?? [];
    list.push({
      id: uuidv4(),
      personId,
      occurredAt: new Date(),
      ...entry,
    });
    this.historyStore.set(personId, list);
  }
}
