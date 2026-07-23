import { createHmac } from 'node:crypto';

export type TokenMode = 'normal' | 'duress';

export interface UserPassTokenResult {
  token: string;
  expiresInSec: number;
  timeBucket: number;
  mode: TokenMode;
}

export interface VisitorPassTokenResult {
  token: string;
  validFrom: Date;
  validTo: Date;
  maxUses: number;
}

/**
 * Generates a dynamic 30-second rotating HMAC-SHA256 QR token for a user's pass.
 * Supports both normal access and silent duress mode.
 *
 * Offline capable: relies only on a pre-cached seed and system clock.
 */
export function generateUserPassToken(
  seedSecret: string,
  personId: string,
  nowMs: number = Date.now(),
  stepSec = 30,
  mode: TokenMode = 'normal',
): UserPassTokenResult {
  const timeBucket = Math.floor(nowMs / 1000 / stepSec);
  const secondsRemaining = stepSec - (Math.floor(nowMs / 1000) % stepSec);

  const modeFlag = mode === 'duress' ? 'D' : 'N';
  const payload = `${personId}::${timeBucket}::${modeFlag}`;
  const signature = createHmac('sha256', seedSecret)
    .update(payload)
    .digest('hex')
    .substring(0, 16);

  const token = `UMBRAL-UP-v1.${personId}.${timeBucket}.${modeFlag}.${signature}`;

  return {
    token,
    expiresInSec: secondsRemaining,
    timeBucket,
    mode,
  };
}

/**
 * Verifies a user pass token (normal or duress).
 * Returns { valid: true, mode } on success, or { valid: false } on failure.
 */
export function verifyUserPassToken(
  token: string,
  seedSecret: string,
  nowMs: number = Date.now(),
  stepSec = 30,
  allowedDriftBuckets = 1,
): { valid: boolean; mode?: TokenMode } {
  if (!token?.startsWith('UMBRAL-UP-v1.')) return { valid: false };

  const parts = token.split('.');
  if (parts.length !== 5) return { valid: false };

  const [, personId, tokenBucketStr, modeFlag, providedSignature] = parts;
  const tokenBucket = parseInt(tokenBucketStr!, 10);
  if (isNaN(tokenBucket)) return { valid: false };
  if (modeFlag !== 'N' && modeFlag !== 'D') return { valid: false };

  const currentBucket = Math.floor(nowMs / 1000 / stepSec);

  for (let offset = -allowedDriftBuckets; offset <= allowedDriftBuckets; offset++) {
    if (currentBucket + offset === tokenBucket) {
      const expectedPayload = `${personId}::${tokenBucket}::${modeFlag}`;
      const expectedSig = createHmac('sha256', seedSecret)
        .update(expectedPayload)
        .digest('hex')
        .substring(0, 16);

      if (providedSignature === expectedSig) {
        return { valid: true, mode: modeFlag === 'D' ? 'duress' : 'normal' };
      }
    }
  }

  return { valid: false };
}

/**
 * Generates a signed token for a visitor guest pass.
 * Encodes visitorId, validFrom epoch, validTo epoch and maxUses.
 */
export function generateVisitorPassToken(
  seedSecret: string,
  visitorPassId: string,
  validFrom: Date,
  validTo: Date,
  maxUses: number,
): VisitorPassTokenResult {
  const fromEpoch = validFrom.getTime();
  const toEpoch = validTo.getTime();

  const payload = `${visitorPassId}::${fromEpoch}::${toEpoch}::${maxUses}`;
  const signature = createHmac('sha256', seedSecret)
    .update(payload)
    .digest('hex')
    .substring(0, 16);

  const token = `UMBRAL-VP-v1.${visitorPassId}.${fromEpoch}.${toEpoch}.${maxUses}.${signature}`;

  return { token, validFrom, validTo, maxUses };
}
