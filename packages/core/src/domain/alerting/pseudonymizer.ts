import { sha256Hex } from '../crypto-utils.js';

export function pseudonymize(personId: string, salt: string = 'umbral-salt-2026'): string {
  const content = `PSEUDO::${salt}::PERSON=${personId}`;
  const hash = sha256Hex(content).toUpperCase();
  return `USR-${hash.substring(0, 6)}`;
}

export const pseudonymizePersonId = pseudonymize;
