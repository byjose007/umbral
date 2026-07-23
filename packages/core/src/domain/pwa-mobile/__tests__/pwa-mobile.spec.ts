import { describe, it, expect } from 'vitest';
import {
  generateOfflineDynamicQRToken,
  verifyOfflineDynamicQRToken,
} from '../offline-qr-generator.js';
import { MusterRoll } from '../muster-roll.entity.js';
import { makeMusterSessionId } from '../ids.js';
import { makeSiteId } from '../../topology/ids.js';

describe('PWA Mobile Domain (User Pass & Guard Console)', () => {
  const seedSecret = 'UMBRAL_OFFLINE_SECRET_KEY_9988776655';
  const personId = 'person-123';

  it('generates and verifies 30-second offline dynamic QR tokens', () => {
    const nowMs = 1700000000000;
    const tokenObj = generateOfflineDynamicQRToken(seedSecret, personId, nowMs);

    expect(tokenObj.token).toContain(`UMBRAL-PASS-v1.${personId}.`);
    expect(tokenObj.expiresInSec).toBeGreaterThan(0);
    expect(tokenObj.expiresInSec).toBeLessThanOrEqual(30);

    // Verify valid token
    const isValid = verifyOfflineDynamicQRToken(tokenObj.token, seedSecret, nowMs);
    expect(isValid).toBe(true);

    // Tampered token fails
    const tamperedToken = tokenObj.token + 'X';
    expect(verifyOfflineDynamicQRToken(tamperedToken, seedSecret, nowMs)).toBe(false);

    // Wrong secret key fails
    expect(verifyOfflineDynamicQRToken(tokenObj.token, 'WRONG_SECRET', nowMs)).toBe(false);
  });

  it('manages MusterRoll evacuation headcount for emergencies', () => {
    const siteId = makeSiteId('site-campus');
    const muster = MusterRoll.create({
      sessionId: makeMusterSessionId('session-fire-01'),
      siteId,
      initiatedBy: 'guard.carlos',
      initiatedAt: new Date(),
      occupants: [
        { personId: 'p1', pseudonym: 'USR-A1', zoneId: 'zone-1', status: 'present_inside' },
        { personId: 'p2', pseudonym: 'USR-A2', zoneId: 'zone-1', status: 'present_inside' },
        { personId: 'p3', pseudonym: 'USR-A3', zoneId: 'zone-2', status: 'present_inside' },
      ],
    })._unsafeUnwrap();

    const initialCounts = muster.getHeadcount();
    expect(initialCounts.totalInside).toBe(3);
    expect(initialCounts.evacuatedCount).toBe(0);
    expect(initialCounts.missingCount).toBe(3);

    // Guard marks person 'p1' as evacuated at assembly point
    const updatedMuster = muster.markEvacuated('p1')._unsafeUnwrap();
    const updatedCounts = updatedMuster.getHeadcount();

    expect(updatedCounts.evacuatedCount).toBe(1);
    expect(updatedCounts.missingCount).toBe(2);
  });
});
