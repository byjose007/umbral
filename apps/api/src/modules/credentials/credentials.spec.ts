import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';
import { BadRequestException } from '@nestjs/common';

describe('CredentialsModule', () => {
  let controller: CredentialsController;
  let service: CredentialsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CredentialsController],
      providers: [CredentialsService],
    }).compile();

    controller = module.get<CredentialsController>(CredentialsController);
    service = module.get<CredentialsService>(CredentialsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('issues physical card and verifies by hash (never plaintext)', () => {
    const rawCardNumber = 'CARD-UID-001998877';
    const cred = controller.issueCredential({
      personId: 'p-1',
      credentialType: 'mifare_desfire',
      rawPayload: rawCardNumber,
      validFrom: '2026-01-01T00:00:00.000Z',
    });

    expect(cred.id).toBeDefined();
    expect(cred.credentialHash).not.toContain(rawCardNumber);
    expect(cred.credentialHash.length).toBe(64);

    const verification = controller.verifyCredential({
      rawPayloadOrQRToken: rawCardNumber,
    });

    expect(verification.valid).toBe(true);
    if (verification.valid) {
      expect(verification.credentialId).toBe(cred.id);
      expect(verification.personId).toBe('p-1');
    }
  });

  it('handles duress PIN verification and flags silent alarm', () => {
    const cred = controller.issueCredential({
      personId: 'p-2',
      credentialType: 'pin',
      rawPayload: 'PERSON_KEYPAD_202',
      pin: '1234',
      duressPin: '9999',
      validFrom: '2026-01-01T00:00:00.000Z',
    });

    // Normal PIN
    const normalVerify = controller.verifyCredential({
      rawPayloadOrQRToken: 'PERSON_KEYPAD_202',
      pin: '1234',
    });
    expect(normalVerify.valid).toBe(true);
    expect(normalVerify.isDuress).toBe(false);

    // Duress PIN
    const duressVerify = controller.verifyCredential({
      rawPayloadOrQRToken: 'PERSON_KEYPAD_202',
      pin: '9999',
    });
    expect(duressVerify.valid).toBe(true);
    expect(duressVerify.isDuress).toBe(true); // Silent alarm flagged!
  });

  it('blocks credential immediately and denies verification', () => {
    const cred = controller.issueCredential({
      personId: 'p-3',
      credentialType: 'mifare_desfire',
      rawPayload: 'LOST_CARD_777',
      validFrom: '2026-01-01T00:00:00.000Z',
    });

    controller.blockCredential({
      credentialId: cred.id,
      reason: 'Tarjeta extraviada en estacionamiento',
    });

    const verify = controller.verifyCredential({
      rawPayloadOrQRToken: 'LOST_CARD_777',
    });

    expect(verify.valid).toBe(false);
    expect(verify.reasonCode).toBe('CREDENTIAL_INACTIVE');
  });

  it('generates dynamic QR token and verifies offline with secret key', () => {
    const cred = controller.issueCredential({
      personId: 'p-4',
      credentialType: 'qr_dynamic',
      rawPayload: 'DYNAMIC_QR_BASE_KEY',
      validFrom: '2026-01-01T00:00:00.000Z',
    });

    const secretKey = 'secret-key-for-guard-pwa-signature';
    const qrResult = controller.generateQRToken({
      credentialId: cred.id,
      personId: 'p-4',
      secretKey,
      ttlSeconds: 60,
    });

    expect(qrResult.qrToken).toBeDefined();

    const verify = controller.verifyCredential({
      rawPayloadOrQRToken: qrResult.qrToken,
      secretKeyForQR: secretKey,
    });

    expect(verify.valid).toBe(true);
    if (verify.valid) {
      expect(verify.credentialId).toBe(cred.id);
    }
  });
});
