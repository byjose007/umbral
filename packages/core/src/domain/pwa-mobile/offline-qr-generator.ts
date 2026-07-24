import { hmacSha256Hex } from '../crypto-utils.js';

export interface OfflineQrTokenResult {
  readonly token: string;
  readonly mode: 'normal' | 'duress';
  readonly validUntil: Date;
  readonly expiresInSec: number;
}

export function generateOfflineDynamicQRToken(
  seedSecret: string,
  personId: string,
  at: Date | number = new Date(),
  mode: 'normal' | 'duress' = 'normal',
  validitySeconds = 30
): OfflineQrTokenResult {
  const atDate = typeof at === 'number' ? new Date(at) : at;
  const nowMs = atDate.getTime();
  const windowIndex = Math.floor(nowMs / (validitySeconds * 1000));
  const validUntil = new Date((windowIndex + 1) * validitySeconds * 1000);
  const expiresInSec = Math.max(0, Math.ceil((validUntil.getTime() - nowMs) / 1000));

  const payload = `OFFLINE-QR::MODE=${mode}::PERSON=${personId}::WIN=${windowIndex}`;
  const hmac = hmacSha256Hex(seedSecret, payload).substring(0, 16);

  const token = `UMBRAL-PASS-v1.${personId}.${windowIndex}.${mode}.${hmac}`;

  return {
    token,
    mode,
    validUntil,
    expiresInSec,
  };
}

export function verifyOfflineDynamicQRToken(
  token: string,
  seedSecret: string,
  at: Date | number = new Date(),
  validitySeconds = 30
): boolean {
  if (!token || typeof token !== 'string') return false;

  const atDate = typeof at === 'number' ? new Date(at) : at;
  const parts = token.split('.');

  if (parts.length === 5 && parts[0] === 'UMBRAL-PASS-v1') {
    const [_, personId, winStr, modeStr, sig] = parts;
    const windowIndex = parseInt(winStr, 10);
    const mode = modeStr as 'normal' | 'duress';

    const currentWindowIndex = Math.floor(atDate.getTime() / (validitySeconds * 1000));
    if (Math.abs(currentWindowIndex - windowIndex) > 1) return false;

    const payload = `OFFLINE-QR::MODE=${mode}::PERSON=${personId}::WIN=${windowIndex}`;
    const expectedHmac = hmacSha256Hex(seedSecret, payload).substring(0, 16);

    return sig === expectedHmac;
  }

  return false;
}
