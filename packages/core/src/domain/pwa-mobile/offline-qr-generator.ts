import { createHmac } from 'node:crypto';

export interface DynamicQRTokenResult {
  token: string;
  expiresInSec: number;
  timeBucket: number;
}

export function generateOfflineDynamicQRToken(
  seedSecret: string,
  personId: string,
  nowMs: number = Date.now(),
  stepSec = 30
): DynamicQRTokenResult {
  const timeBucket = Math.floor(nowMs / 1000 / stepSec);
  const secondsRemaining = stepSec - (Math.floor(nowMs / 1000) % stepSec);

  const payload = `${personId}::${timeBucket}`;
  const signature = createHmac('sha256', seedSecret).update(payload).digest('hex').substring(0, 16);

  const token = `UMBRAL-PASS-v1.${personId}.${timeBucket}.${signature}`;

  return {
    token,
    expiresInSec: secondsRemaining,
    timeBucket,
  };
}

export function verifyOfflineDynamicQRToken(
  token: string,
  seedSecret: string,
  nowMs: number = Date.now(),
  stepSec = 30,
  allowedDriftBuckets = 1
): boolean {
  if (!token || !token.startsWith('UMBRAL-PASS-v1.')) {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 4) return false;

  const [, personId, tokenBucketStr, providedSignature] = parts;
  const tokenBucket = parseInt(tokenBucketStr!, 10);
  if (isNaN(tokenBucket)) return false;

  const currentBucket = Math.floor(nowMs / 1000 / stepSec);

  // Check current bucket and drift tolerance (e.g. ±1 bucket for clock skew)
  for (let offset = -allowedDriftBuckets; offset <= allowedDriftBuckets; offset++) {
    const candidateBucket = currentBucket + offset;
    if (candidateBucket === tokenBucket) {
      const expectedPayload = `${personId}::${tokenBucket}`;
      const expectedSignature = createHmac('sha256', seedSecret)
        .update(expectedPayload)
        .digest('hex')
        .substring(0, 16);

      if (providedSignature === expectedSignature) {
        return true;
      }
    }
  }

  return false;
}
