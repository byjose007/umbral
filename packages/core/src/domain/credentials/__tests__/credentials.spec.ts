import { describe, it, expect } from 'vitest';
import { Credential } from '../credential.entity.js';
import { makeCredentialId } from '../ids.js';
import { makePersonId } from '../../identity/ids.js';
import { hashCredentialPayload, hashPin } from '../credential-hash.js';
import { generateDynamicQRToken, verifyDynamicQRToken } from '../qr-signer.js';

describe('Credentials Domain', () => {
  const personId = makePersonId('person-101');
  const secretKey = 'umbral-secret-key-32-chars-long!';

  it('hashes credential payloads and never stores raw card numbers', () => {
    const rawCardNumber = '9988776655443322';
    const hashed = hashCredentialPayload(rawCardNumber);

    expect(hashed).not.toContain(rawCardNumber);
    expect(hashed.length).toBe(64); // SHA-256 hex length
  });

  it('creates MIFARE DESFire credential entity', () => {
    const credentialId = makeCredentialId('cred-1');
    const rawCard = '04A1B2C3D4E5F6';
    const cardHash = hashCredentialPayload(rawCard);

    const cred = Credential.create({
      id: credentialId,
      personId,
      credentialType: 'mifare_desfire',
      credentialHash: cardHash,
      status: 'active',
      validFrom: new Date('2026-01-01'),
    })._unsafeUnwrap();

    expect(cred.credentialType).toBe('mifare_desfire');
    expect(cred.credentialHash).toBe(cardHash);
    expect(cred.isActiveAt(new Date('2026-07-15'))).toBe(true);
  });

  it('rejects prohibited card technologies like 125kHz / MIFARE Classic', () => {
    const credentialId = makeCredentialId('cred-prohibited');
    const res = Credential.create({
      id: credentialId,
      personId,
      credentialType: 'mifare_classic' as any,
      credentialHash: 'hash123',
      status: 'active',
      validFrom: new Date('2026-01-01'),
    });

    expect(res.isErr()).toBe(true);
    if (res.isErr()) {
      expect(res.error.code).toBe('PROHIBITED_TECHNOLOGY');
    }
  });

  it('blocks a credential immediately with a reason', () => {
    const credentialId = makeCredentialId('cred-2');
    const cred = Credential.create({
      id: credentialId,
      personId,
      credentialType: 'mifare_desfire',
      credentialHash: hashCredentialPayload('12345'),
      status: 'active',
      validFrom: new Date('2026-01-01'),
    })._unsafeUnwrap();

    expect(cred.isActiveAt()).toBe(true);

    const blockedResult = cred.block('Perdida de tarjeta física');
    expect(blockedResult.isOk()).toBe(true);

    const blockedCred = blockedResult._unsafeUnwrap();
    expect(blockedCred.status).toBe('blocked');
    expect(blockedCred.blockReason).toBe('Perdida de tarjeta física');
    expect(blockedCred.isActiveAt()).toBe(false);
  });

  it('supports PIN verification and detects duress PIN', () => {
    const credentialId = makeCredentialId('cred-pin');
    const normalPinHash = hashPin('1234');
    const duressPinHash = hashPin('9999');

    const cred = Credential.create({
      id: credentialId,
      personId,
      credentialType: 'pin',
      credentialHash: hashCredentialPayload('PIN_PAYLOAD_101'),
      pinHash: normalPinHash,
      duressPinHash: duressPinHash,
      status: 'active',
      validFrom: new Date('2026-01-01'),
    })._unsafeUnwrap();

    expect(cred.verifyPin('1234')).toBe(true);
    expect(cred.verifyPin('5555')).toBe(false);
    expect(cred.isDuressPin('9999')).toBe(true);
    expect(cred.isDuressPin('1234')).toBe(false);
  });

  it('generates and verifies signed dynamic QR tokens offline', () => {
    const credentialId = 'cred-qr-01';
    const token = generateDynamicQRToken(credentialId, personId, secretKey, 30);

    const verified = verifyDynamicQRToken(token, secretKey);
    expect(verified.isOk()).toBe(true);
    if (verified.isOk()) {
      expect(verified.value.credentialId).toBe(credentialId);
      expect(verified.value.personId).toBe(personId);
    }
  });

  it('rejects expired dynamic QR tokens', () => {
    const credentialId = 'cred-qr-02';
    const token = generateDynamicQRToken(credentialId, personId, secretKey, -10); // expired 10s ago

    const verified = verifyDynamicQRToken(token, secretKey);
    expect(verified.isErr()).toBe(true);
    if (verified.isErr()) {
      expect(verified.error.code).toBe('QR_TOKEN_EXPIRED');
    }
  });
});
