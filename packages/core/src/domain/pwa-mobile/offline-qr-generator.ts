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

export interface OfflineQrDiagnostics {
  rawToken: string;
  partsCount: number;
  prefix: string;
  personId: string;
  winToken: number;
  winCurrent: number;
  drift: number;
  mode: string;
  sigToken: string;
  sigExpected: string;
  isValidSig: boolean;
  reason: string;
}

export function getOfflineDynamicQRTokenDiagnostics(
  token: string,
  seedSecret: string,
  at: Date | number = new Date(),
  validitySeconds = 30,
  maxWindowDrift = 10
): OfflineQrDiagnostics {
  const atDate = typeof at === 'number' ? new Date(at) : at;
  const rawToken = token || '';
  const parts = rawToken.trim().split('.');

  if (parts.length !== 5) {
    return {
      rawToken,
      partsCount: parts.length,
      prefix: parts[0] || '',
      personId: parts[1] || '',
      winToken: -1,
      winCurrent: Math.floor(atDate.getTime() / (validitySeconds * 1000)),
      drift: -1,
      mode: '',
      sigToken: '',
      sigExpected: '',
      isValidSig: false,
      reason: `Formato inválido (${parts.length} bloques): '${rawToken.substring(0, 30)}...'`,
    };
  }

  const [prefix, personId, winStr, modeStr, sigToken] = parts;
  const windowIndex = parseInt(winStr, 10);
  const currentWindowIndex = Math.floor(atDate.getTime() / (validitySeconds * 1000));
  const drift = Math.abs(currentWindowIndex - windowIndex);
  const mode = modeStr;

  const payload = `OFFLINE-QR::MODE=${mode}::PERSON=${personId}::WIN=${windowIndex}`;
  const sigExpected = hmacSha256Hex(seedSecret, payload).substring(0, 16);

  if (prefix !== 'UMBRAL-PASS-v1') {
    return {
      rawToken,
      partsCount: 5,
      prefix,
      personId,
      winToken: windowIndex,
      winCurrent: currentWindowIndex,
      drift,
      mode,
      sigToken,
      sigExpected,
      isValidSig: false,
      reason: `Prefijo no coincide: '${prefix}' (se esperaba UMBRAL-PASS-v1)`,
    };
  }

  if (isNaN(windowIndex) || drift > maxWindowDrift) {
    return {
      rawToken,
      partsCount: 5,
      prefix,
      personId,
      winToken: windowIndex,
      winCurrent: currentWindowIndex,
      drift,
      mode,
      sigToken,
      sigExpected,
      isValidSig: false,
      reason: `Ventana de tiempo fuera de rango: diferencia de ${drift} ventanas (> ${maxWindowDrift})`,
    };
  }

  if (sigToken !== sigExpected) {
    return {
      rawToken,
      partsCount: 5,
      prefix,
      personId,
      winToken: windowIndex,
      winCurrent: currentWindowIndex,
      drift,
      mode,
      sigToken,
      sigExpected,
      isValidSig: false,
      reason: `Firma HMAC no coincide: '${sigToken}' vs '${sigExpected}'`,
    };
  }

  return {
    rawToken,
    partsCount: 5,
    prefix,
    personId,
    winToken: windowIndex,
    winCurrent: currentWindowIndex,
    drift,
    mode,
    sigToken,
    sigExpected,
    isValidSig: true,
    reason: 'Firma y Token Válidos (OK)',
  };
}

export function verifyOfflineDynamicQRToken(
  token: string,
  seedSecret: string,
  at: Date | number = new Date(),
  validitySeconds = 30,
  maxWindowDrift = 10
): boolean {
  const diag = getOfflineDynamicQRTokenDiagnostics(token, seedSecret, at, validitySeconds, maxWindowDrift);
  return diag.isValidSig;
}
