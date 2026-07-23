import { createHash } from 'node:crypto';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function computeEventHash(
  prevHash: string,
  eventId: string,
  timestampISO: string,
  eventType: string,
  payloadStr = ''
): string {
  const content = `${prevHash}::${eventId}::${timestampISO}::${eventType}::${payloadStr}`;
  return createHash('sha256').update(content).digest('hex');
}
