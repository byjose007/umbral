import { createHash } from 'node:crypto';

export function hashCredentialPayload(rawPayload: string): string {
  const normalized = rawPayload.trim().toUpperCase();
  return createHash('sha256').update(`UMBRAL_CARD_SALT::${normalized}`).digest('hex');
}

export function hashPin(pin: string): string {
  const normalized = pin.trim();
  return createHash('sha256').update(`UMBRAL_PIN_SALT::${normalized}`).digest('hex');
}
