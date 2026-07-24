import { sha256Hex } from '../crypto-utils.js';

export type CredentialFormat = 'rfid_uid' | 'pin_code' | 'signed_qr' | 'mobile_pwa' | 'biometric_template';

export function computeCredentialHash(
  rawValueOrFormat: string,
  rawValue?: string,
  facilityCode?: number | null
): string {
  let formatStr = 'rfid_uid';
  let rawStr = rawValueOrFormat;

  if (rawValue !== undefined) {
    formatStr = rawValueOrFormat;
    rawStr = rawValue;
  }

  const normalizedRaw = rawStr.trim().toUpperCase();
  const fcPart = facilityCode != null ? `::FC=${facilityCode}` : '';
  const content = `CRED::FORMAT=${formatStr}::RAW=${normalizedRaw}${fcPart}`;
  return sha256Hex(content);
}

export const hashCredentialPayload = computeCredentialHash;

export function hashPin(pin: string, salt: string = 'umbral-pin-salt'): string {
  return sha256Hex(`PIN::${salt}::${pin.trim()}`);
}
