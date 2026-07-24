import { hmacSha256Hex } from '../crypto-utils.js';

export type TokenMode = 'normal' | 'duress';

export interface GeneratedTokenResult {
  readonly token: string;
  readonly mode: TokenMode;
  readonly validUntil: Date;
  readonly windowIndex: number;
  readonly timeBucket: number;
  readonly expiresInSec: number;
}

export function generateUserPassToken(
  seedSecret: string,
  personId: string,
  at: Date | number | TokenMode = new Date(),
  validitySecondsOrMode: number | TokenMode = 30,
  mode: TokenMode = 'normal'
): GeneratedTokenResult {
  let actualAt: Date | number = new Date();
  let actualValiditySec = 30;
  let actualMode: TokenMode = 'normal';

  if (typeof at === 'string' && (at === 'normal' || at === 'duress')) {
    actualMode = at;
    actualAt = new Date();
  } else {
    if (typeof at === 'number' || at instanceof Date) {
      actualAt = at;
    }
    if (typeof validitySecondsOrMode === 'number') {
      actualValiditySec = validitySecondsOrMode;
      actualMode = mode;
    } else if (typeof validitySecondsOrMode === 'string') {
      actualMode = validitySecondsOrMode as TokenMode;
    }
  }

  const atDate = typeof actualAt === 'number' ? new Date(actualAt) : actualAt;
  const nowMs = atDate.getTime();
  const windowIndex = Math.floor(nowMs / (actualValiditySec * 1000));
  const validUntil = new Date((windowIndex + 1) * actualValiditySec * 1000);
  const expiresInSec = Math.max(0, Math.ceil((validUntil.getTime() - nowMs) / 1000));

  const modeChar = actualMode === 'duress' ? 'D' : 'N';
  const payload = `USER-PASS::${personId}::${windowIndex}::${modeChar}`;
  const hmac = hmacSha256Hex(seedSecret, payload).substring(0, 16);

  const token = `UMBRAL-UP-v1.${personId}.${windowIndex}.${modeChar}.${hmac}`;

  return {
    token,
    mode: actualMode,
    validUntil,
    windowIndex,
    timeBucket: windowIndex,
    expiresInSec,
  };
}

export function verifyUserPassToken(
  token: string,
  seedSecret: string,
  at: Date | number = new Date(),
  validitySeconds = 30
): { valid: boolean; mode?: TokenMode; personId?: string; reason?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  const atDate = typeof at === 'number' ? new Date(at) : at;
  const parts = token.split('.');

  if (parts.length === 5 && parts[0] === 'UMBRAL-UP-v1') {
    const [_, personId, winStr, modeChar, sig] = parts;
    const windowIndex = parseInt(winStr, 10);
    const mode: TokenMode = modeChar === 'D' ? 'duress' : 'normal';

    const currentWindowIndex = Math.floor(atDate.getTime() / (validitySeconds * 1000));

    if (Math.abs(currentWindowIndex - windowIndex) > 1) {
      return { valid: false, reason: 'TOKEN_EXPIRED' };
    }

    const expectedPayload = `USER-PASS::${personId}::${windowIndex}::${modeChar}`;
    const expectedHmac = hmacSha256Hex(seedSecret, expectedPayload).substring(0, 16);

    if (sig !== expectedHmac) {
      return { valid: false, reason: 'INVALID_SIGNATURE' };
    }

    return { valid: true, mode, personId };
  }

  return { valid: false, reason: 'INVALID_FORMAT' };
}

export function generateVisitorPassToken(
  seedSecret: string,
  visitorPassId: string,
  validFrom: Date,
  validTo: Date,
  maxUses = 1
): { token: string; signature: string } {
  const payload = `VISITOR-PASS::ID=${visitorPassId}::FROM=${validFrom.toISOString()}::TO=${validTo.toISOString()}::USES=${maxUses}`;
  const signature = hmacSha256Hex(seedSecret, payload).substring(0, 16);
  const token = `UMBRAL-VP-v1.${visitorPassId}.${validFrom.getTime()}.${validTo.getTime()}.${maxUses}.${signature}`;

  return { token, signature };
}
