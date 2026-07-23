import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UserPassController } from './user-pass.controller';
import { UserPassService } from './user-pass.service';
import {
  generateUserPassToken,
  generateVisitorPassToken,
} from '@umbral/core';
import {
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

describe('UserPassModule', () => {
  let controller: UserPassController;
  let service: UserPassService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserPassController],
      providers: [UserPassService],
    }).compile();

    controller = module.get<UserPassController>(UserPassController);
    service = module.get<UserPassService>(UserPassService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  // ─── Login & Seed Provisioning ──────────────────────────────────────────────

  it('provisions a new seed on first login and returns encrypted seed & salt', () => {
    const result = controller.login({
      personId: 'person-001',
      pinHash: 'PBKDF2_HASH_PLACEHOLDER',
    });

    expect(result.seedSecret).toBeDefined();
    expect(result.encryptedSeed).toBeDefined();
    expect(result.salt).toBeDefined();
  });

  it('returns the same seed on subsequent logins (idempotent provisioning)', () => {
    const dto = { personId: 'person-002', pinHash: 'PBKDF2_HASH' };
    const first = controller.login(dto);
    const second = controller.login(dto);

    expect(first.seedSecret).toBe(second.seedSecret);
    expect(first.encryptedSeed).toBe(second.encryptedSeed);
  });

  it('rejects login without personId or pinHash', () => {
    expect(() => controller.login({ personId: '', pinHash: '' })).toThrow(UnauthorizedException);
  });

  it('retrieves seed via GET seed/:personId after login', () => {
    const personId = 'person-003';
    const loginResult = controller.login({ personId, pinHash: 'HASH' });
    const seedResult = controller.getSeed(personId);

    expect(seedResult.seedSecret).toBe(loginResult.seedSecret);
  });

  it('throws NotFoundException when getting seed for unknown person', () => {
    expect(() => controller.getSeed('unknown-person-999')).toThrow(NotFoundException);
  });

  // ─── Token Verification ─────────────────────────────────────────────────────

  it('verifies a valid normal-mode token and returns valid=true', () => {
    const personId = 'person-004';
    const { seedSecret } = controller.login({ personId, pinHash: 'HASH' });

    // Generate a token using the same seed the service provisioned (static import)
    const { token } = generateUserPassToken(seedSecret, personId);

    const result = controller.verifyToken({ token, personId });
    expect(result.valid).toBe(true);
    expect(result.mode).toBe('normal');
  });

  it('returns invalid for a tampered token', () => {
    const personId = 'person-005';
    const { seedSecret } = controller.login({ personId, pinHash: 'HASH' });

    const { token } = generateUserPassToken(seedSecret, personId);

    const result = controller.verifyToken({ token: token + 'XXX', personId });
    expect(result.valid).toBe(false);
  });

  // ─── Access History ─────────────────────────────────────────────────────────

  it('returns empty history for a new user', () => {
    controller.login({ personId: 'person-006', pinHash: 'HASH' });
    const history = controller.getAccessHistory('person-006');
    expect(history).toHaveLength(0);
  });

  it('records and retrieves door access events', () => {
    const personId = 'person-007';
    controller.login({ personId, pinHash: 'HASH' });

    service.recordAccessEvent(personId, 'Lobby Main', 'ENTRY', true);
    service.recordAccessEvent(personId, 'Parking B1', 'EXIT', true);

    const history = controller.getAccessHistory(personId);
    expect(history).toHaveLength(2);
    expect(history[0]!.doorLabel).toBe('Parking B1'); // most recent first
    expect(history[1]!.doorLabel).toBe('Lobby Main');
  });

  // ─── Visitor Pass Issuance ─────────────────────────────────────────────────

  it('issues a visitor pass and returns a share URL', () => {
    const personId = 'person-008';
    controller.login({ personId, pinHash: 'HASH' });

    const now = new Date();
    const validFrom = now.toISOString();
    const validTo = new Date(now.getTime() + 3600 * 1000).toISOString();

    const pass = controller.issueVisitorPass({
      issuerPersonId: personId,
      visitorName: 'Carlos Invitado',
      validFrom,
      validTo,
      maxUses: 2,
    });

    expect(pass.id).toBeDefined();
    expect(pass.signedQrToken).toMatch(/^UMBRAL-VP-v1\./);
    expect(pass.shareUrl).toContain('access.umbral.io/v/');
    expect(pass.status).toBe('active');
  });

  it('rejects a visitor pass with validTo in the past', () => {
    const personId = 'person-009';
    controller.login({ personId, pinHash: 'HASH' });

    const past = new Date(Date.now() - 3600 * 1000);
    expect(() =>
      controller.issueVisitorPass({
        issuerPersonId: personId,
        visitorName: 'Pedro Pasado',
        validFrom: new Date(Date.now() - 7200 * 1000).toISOString(),
        validTo: past.toISOString(),
      }),
    ).toThrow(BadRequestException);
  });

  it('lists visitor passes filtered by status', () => {
    const personId = 'person-010';
    controller.login({ personId, pinHash: 'HASH' });

    const now = new Date();
    const validFrom = now.toISOString();
    const validTo = new Date(now.getTime() + 3600 * 1000).toISOString();

    controller.issueVisitorPass({ issuerPersonId: personId, visitorName: 'Ana Activa', validFrom, validTo, maxUses: 1 });

    const active = controller.getVisitorPasses(personId, 'active');
    expect(active).toHaveLength(1);

    const expired = controller.getVisitorPasses(personId, 'expired');
    expect(expired).toHaveLength(0);
  });

  it('records a visitor pass use and reduces remaining uses', () => {
    const personId = 'person-011';
    controller.login({ personId, pinHash: 'HASH' });

    const now = new Date();
    const pass = controller.issueVisitorPass({
      issuerPersonId: personId,
      visitorName: 'Luis 2 Usos',
      validFrom: now.toISOString(),
      validTo: new Date(now.getTime() + 3600 * 1000).toISOString(),
      maxUses: 2,
    });

    const result = controller.recordVisitorPassUse({ visitorPassId: pass.id });
    expect(result.remainingUses).toBe(1);
    expect(result.status).toBe('active');
  });
});
