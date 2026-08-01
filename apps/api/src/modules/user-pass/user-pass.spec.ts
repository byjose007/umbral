import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UserPassController } from './user-pass.controller';
import { UserPassService } from './user-pass.service';
import { generateUserPassToken, generateVisitorPassToken } from '@umbral/core';
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

  function enrollPerson(personId: string, pinHash = 'HASH') {
    const { activationCode } = controller.generateActivationCode({ personId });
    return controller.enroll({ personId, activationCode, pinHash });
  }

  // ─── Activation, Enrollment & Seed Provisioning ───────────────────────────

  it('generates an activation code and enrolls a new person with a PIN hash', () => {
    const personId = 'person-001';
    const { activationCode } = controller.generateActivationCode({ personId });
    expect(activationCode).toHaveLength(6);

    const result = controller.enroll({
      personId,
      activationCode,
      pinHash: 'PBKDF2_HASH_PLACEHOLDER',
    });

    expect(result.seedSecret).toBeDefined();
    expect(result.encryptedSeed).toBeDefined();
    expect(result.salt).toBeDefined();
  });

  it('rejects login for an un-enrolled person', () => {
    expect(() =>
      controller.login({ personId: 'unenrolled-person', pinHash: 'HASH' }),
    ).toThrow(UnauthorizedException);
  });

  it('rejects enrollment with an invalid or expired activation code', () => {
    expect(() =>
      controller.enroll({
        personId: 'person-001',
        activationCode: '000000',
        pinHash: 'HASH',
      }),
    ).toThrow(UnauthorizedException);
  });

  it('allows logging in after enrollment', () => {
    const personId = 'person-002';
    const enrolled = enrollPerson(personId, 'PBKDF2_HASH');
    const loggedIn = controller.login({ personId, pinHash: 'PBKDF2_HASH' });

    expect(loggedIn.seedSecret).toBe(enrolled.seedSecret);
    expect(loggedIn.encryptedSeed).toBe(enrolled.encryptedSeed);
  });

  it('rejects login without personId or pinHash', () => {
    expect(() => controller.login({ personId: '', pinHash: '' })).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects login with the wrong PIN hash', () => {
    const personId = 'person-pin-01';
    enrollPerson(personId, 'CORRECT_HASH');

    expect(() =>
      controller.login({ personId, pinHash: 'WRONG_HASH' }),
    ).toThrow(UnauthorizedException);
  });

  it('revokes a pass and prevents further login until re-enrolled', () => {
    const personId = 'person-revoke-01';
    enrollPerson(personId, 'PIN_1234');

    const revoked = controller.revoke({ personId });
    expect(revoked.status).toBe('revoked');
    expect(revoked.newActivationCode).toHaveLength(6);

    expect(() => controller.login({ personId, pinHash: 'PIN_1234' })).toThrow(
      UnauthorizedException,
    );

    // Re-enroll with the new activation code
    controller.enroll({
      personId,
      activationCode: revoked.newActivationCode,
      pinHash: 'PIN_5678',
    });

    const loggedIn = controller.login({ personId, pinHash: 'PIN_5678' });
    expect(loggedIn.seedSecret).toBeDefined();
  });

  it('retrieves seed via GET seed/:personId after login', () => {
    const personId = 'person-003';
    enrollPerson(personId, 'HASH');
    const loginResult = controller.login({ personId, pinHash: 'HASH' });
    const seedResult = controller.getSeed(personId);

    expect(seedResult.seedSecret).toBe(loginResult.seedSecret);
  });

  it('throws NotFoundException when getting seed for unknown person', () => {
    expect(() => controller.getSeed('unknown-person-999')).toThrow(
      NotFoundException,
    );
  });

  // ─── Token Verification ─────────────────────────────────────────────────────

  it('verifies a valid normal-mode token and returns valid=true', () => {
    const personId = 'person-004';
    enrollPerson(personId, 'HASH');
    const { seedSecret } = controller.login({ personId, pinHash: 'HASH' });

    // Generate a token using the same seed the service provisioned (static import)
    const { token } = generateUserPassToken(seedSecret, personId);

    const result = controller.verifyToken({ token, personId });
    expect(result.valid).toBe(true);
    expect(result.mode).toBe('normal');
  });

  it('returns invalid for a tampered token', () => {
    const personId = 'person-005';
    enrollPerson(personId, 'HASH');
    const { seedSecret } = controller.login({ personId, pinHash: 'HASH' });

    const { token } = generateUserPassToken(seedSecret, personId);

    const result = controller.verifyToken({ token: token + 'XXX', personId });
    expect(result.valid).toBe(false);
  });

  // ─── Access History ─────────────────────────────────────────────────────────

  it('returns empty history for a new user', () => {
    enrollPerson('person-006', 'HASH');
    controller.login({ personId: 'person-006', pinHash: 'HASH' });
    const history = controller.getAccessHistory('person-006');
    expect(history).toHaveLength(0);
  });

  it('records and retrieves door access events', () => {
    const personId = 'person-007';
    enrollPerson(personId, 'HASH');
    controller.login({ personId, pinHash: 'HASH' });

    service.recordAccessEvent(personId, 'Lobby Main', 'ENTRY', true);
    service.recordAccessEvent(personId, 'Parking B1', 'EXIT', true);

    const history = controller.getAccessHistory(personId);
    expect(history).toHaveLength(2);
    expect(history[0].doorLabel).toBe('Parking B1'); // most recent first
    expect(history[1].doorLabel).toBe('Lobby Main');
  });

  // ─── Visitor Pass Issuance ─────────────────────────────────────────────────

  it('issues a visitor pass and returns a share URL', () => {
    const personId = 'person-008';
    enrollPerson(personId, 'HASH');
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
    enrollPerson(personId, 'HASH');
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
    enrollPerson(personId, 'HASH');
    controller.login({ personId, pinHash: 'HASH' });

    const now = new Date();
    const validFrom = now.toISOString();
    const validTo = new Date(now.getTime() + 3600 * 1000).toISOString();

    controller.issueVisitorPass({
      issuerPersonId: personId,
      visitorName: 'Ana Activa',
      validFrom,
      validTo,
      maxUses: 1,
    });

    const active = controller.getVisitorPasses(personId, 'active');
    expect(active).toHaveLength(1);

    const expired = controller.getVisitorPasses(personId, 'expired');
    expect(expired).toHaveLength(0);
  });

  it('records a visitor pass use and reduces remaining uses', () => {
    const personId = 'person-011';
    enrollPerson(personId, 'HASH');
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

