import { sha256Hex } from '../crypto-utils.js';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function computeEventHash(
  prevHash: string,
  eventId: string,
  timestampISO: string,
  eventType: string,
  payloadStr = ''
): string {
  const content = `${prevHash}::${eventId}::${timestampISO}::${eventType}::${payloadStr}`;
  return sha256Hex(content);
}
