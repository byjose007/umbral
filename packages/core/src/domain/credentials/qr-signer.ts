import { createHmac, randomBytes } from 'node:crypto';
import { ok, err, Result } from 'neverthrow';
import { DomainError, CredentialError } from './errors.js';

export interface DynamicQRTokenPayload {
  readonly credentialId: string;
  readonly personId: string;
  readonly nonce: string;
  readonly issuedAt: number; // epoch ms
  readonly expiresAt: number; // epoch ms
  readonly isSingleUse?: boolean;
}

export function generateDynamicQRToken(
  credentialId: string,
  personId: string,
  secretKey: string,
  ttlSeconds = 60,
  isSingleUse = false
): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + ttlSeconds * 1000;
  const nonce = randomBytes(8).toString('hex');

  const payload: DynamicQRTokenPayload = {
    credentialId,
    personId,
    nonce,
    issuedAt,
    expiresAt,
    isSingleUse,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secretKey).update(payloadBase64).digest('base64url');

  return `${payloadBase64}.${signature}`;
}

export function verifyDynamicQRToken(
  token: string,
  secretKey: string,
  at: Date = new Date()
): Result<DynamicQRTokenPayload, DomainError> {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return err(new CredentialError('Invalid QR token format', 'INVALID_QR_TOKEN'));
  }

  const [payloadBase64, signature] = parts;
  if (!payloadBase64 || !signature) {
    return err(new CredentialError('Invalid QR token format', 'INVALID_QR_TOKEN'));
  }

  const expectedSignature = createHmac('sha256', secretKey).update(payloadBase64).digest('base64url');
  if (signature !== expectedSignature) {
    return err(new CredentialError('QR token signature verification failed', 'INVALID_QR_SIGNATURE'));
  }

  try {
    const jsonStr = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as DynamicQRTokenPayload;

    if (at.getTime() > payload.expiresAt) {
      return err(new CredentialError('QR token has expired', 'QR_TOKEN_EXPIRED'));
    }

    return ok(payload);
  } catch {
    return err(new CredentialError('Failed to parse QR payload', 'INVALID_QR_PAYLOAD'));
  }
}
