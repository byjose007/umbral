import { createHash } from 'node:crypto';

export function pseudonymizePersonId(personId: string | null | undefined): string | null {
  if (!personId) return null;
  const hash = createHash('sha256').update(`UMBRAL_PSEUDO_SALT::${personId}`).digest('hex');
  const shortCode = hash.substring(0, 6).toUpperCase();
  return `USR-${shortCode}`;
}
