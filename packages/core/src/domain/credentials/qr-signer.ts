import { hmacSha256Hex, randomHexBytes } from '../crypto-utils.js';
import { PersonId } from '../identity/ids.js';
import { ok, err, Result } from 'neverthrow';
import { DomainError } from '../topology/errors.js';

export interface SignedQrPayload {
  readonly personId: PersonId;
  readonly facilityCode: number;
  readonly validFrom: Date;
  readonly validUntil: Date;
  readonly nonce: string;
}

export interface SignQrResult {
  readonly rawToken: string;
  readonly signature: string;
  readonly payload: SignedQrPayload;
}

export function signQrPayload(
  payload: Omit<SignedQrPayload, 'nonce'>,
  secretKey: string,
  providedNonce?: string
): SignQrResult {
  const nonce = providedNonce ?? randomHexBytes(8);
  const fullPayload: SignedQrPayload = {
    ...payload,
    nonce,
  };

  const payloadString = [
    fullPayload.personId,
    fullPayload.facilityCode.toString(),
    fullPayload.validFrom.toISOString(),
    fullPayload.validUntil.toISOString(),
    fullPayload.nonce,
  ].join('::');

  const signature = hmacSha256Hex(secretKey, payloadString).substring(0, 32);
  const rawToken = `UMBRAL-QR-V1::${payloadString}::SIG=${signature}`;

  return {
    rawToken,
    signature,
    payload: fullPayload,
  };
}

export function generateDynamicQRToken(
  credentialId: string,
  personId: string,
  secretKey: string,
  ttlSeconds = 60,
  isSingleUse = false
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payloadStr = `${credentialId}.${personId}.${expiresAt}.${isSingleUse ? 1 : 0}`;
  const sig = hmacSha256Hex(secretKey, payloadStr).substring(0, 16);
  return `${payloadStr}.${sig}`;
}

export function verifyQrToken(rawToken: string, secretKey: string): {
  valid: boolean;
  reason?: string;
  payload?: SignedQrPayload;
} {
  const parts = rawToken.split('::');
  if (parts.length !== 7 || parts[0] !== 'UMBRAL-QR-V1' || !parts[6].startsWith('SIG=')) {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  const [_, personId, fcStr, fromStr, untilStr, nonce, sigPart] = parts;
  const signature = sigPart.replace('SIG=', '');

  const validFrom = new Date(fromStr);
  const validUntil = new Date(untilStr);
  const facilityCode = parseInt(fcStr, 10);

  if (isNaN(validFrom.getTime()) || isNaN(validUntil.getTime()) || isNaN(facilityCode)) {
    return { valid: false, reason: 'INVALID_TIMESTAMP_OR_FC' };
  }

  const payloadString = [personId, fcStr, fromStr, untilStr, nonce].join('::');
  const expectedSig = hmacSha256Hex(secretKey, payloadString).substring(0, 32);

  if (signature !== expectedSig) {
    return { valid: false, reason: 'SIGNATURE_MISMATCH' };
  }

  const now = new Date();
  if (now < validFrom) {
    return { valid: false, reason: 'TOKEN_NOT_YET_VALID' };
  }
  if (now > validUntil) {
    return { valid: false, reason: 'TOKEN_EXPIRED' };
  }

  return {
    valid: true,
    payload: {
      personId: personId as PersonId,
      facilityCode,
      validFrom,
      validUntil,
      nonce,
    },
  };
}

export function verifyDynamicQRToken(
  token: string,
  secretKey: string
): Result<{ credentialId: string; personId: string; expiresAt: number }, DomainError> {
  const parts = token.split('.');
  if (parts.length !== 5) {
    return err(new DomainError('INVALID_QR_TOKEN', 'Malformed QR token format'));
  }

  const [credentialId, personId, expiresAtStr, isSingleUseStr, sig] = parts;
  const payloadStr = `${credentialId}.${personId}.${expiresAtStr}.${isSingleUseStr}`;
  const expectedSig = hmacSha256Hex(secretKey, payloadStr).substring(0, 16);

  if (sig !== expectedSig) {
    return err(new DomainError('INVALID_QR_SIGNATURE', 'QR token signature mismatch'));
  }

  const expiresAt = parseInt(expiresAtStr, 10);
  const now = Math.floor(Date.now() / 1000);
  if (now > expiresAt) {
    return err(new DomainError('QR_TOKEN_EXPIRED', 'Dynamic QR token has expired'));
  }

  return ok({ credentialId, personId, expiresAt });
}
