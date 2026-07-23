import { describe, it, expect } from 'vitest';
import {
  generateUserPassToken,
  verifyUserPassToken,
  generateVisitorPassToken,
} from '../user-pass-generator.js';
import { VisitorPass } from '../visitor-pass.entity.js';
import { makeUserPassId, makeVisitorPassId } from '../ids.js';
import {
  InvalidPassSeedError,
  VisitorPassExpiredError,
} from '../errors.js';

describe('User Pass Domain', () => {
  const seedSecret = 'UMBRAL_USER_PASS_TEST_SECRET_12345';
  const personId = 'person-abc-001';
  const fixedNowMs = 1700000000000; // fixed timestamp for deterministic tests

  // ─── Token Generation ───────────────────────────────────────────────────────

  describe('generateUserPassToken', () => {
    it('generates a valid normal-mode token with correct format', () => {
      const result = generateUserPassToken(seedSecret, personId, fixedNowMs);

      expect(result.token).toMatch(/^UMBRAL-UP-v1\..+\.\d+\.N\.[a-f0-9]{16}$/);
      expect(result.mode).toBe('normal');
      expect(result.expiresInSec).toBeGreaterThan(0);
      expect(result.expiresInSec).toBeLessThanOrEqual(30);
    });

    it('generates a duress-mode token with D flag embedded', () => {
      const result = generateUserPassToken(seedSecret, personId, fixedNowMs, 30, 'duress');

      expect(result.token).toMatch(/^UMBRAL-UP-v1\..+\.\d+\.D\.[a-f0-9]{16}$/);
      expect(result.mode).toBe('duress');
    });

    it('normal and duress tokens for same person+time are visually distinguishable only by mode flag', () => {
      const normal = generateUserPassToken(seedSecret, personId, fixedNowMs, 30, 'normal');
      const duress = generateUserPassToken(seedSecret, personId, fixedNowMs, 30, 'duress');

      // Same time bucket
      expect(normal.timeBucket).toBe(duress.timeBucket);
      // Different tokens (different payload → different signature)
      expect(normal.token).not.toBe(duress.token);
    });
  });

  // ─── Token Verification ─────────────────────────────────────────────────────

  describe('verifyUserPassToken', () => {
    it('verifies a freshly generated normal token as valid', () => {
      const { token } = generateUserPassToken(seedSecret, personId, fixedNowMs);
      const result = verifyUserPassToken(token, seedSecret, fixedNowMs);

      expect(result.valid).toBe(true);
      expect(result.mode).toBe('normal');
    });

    it('verifies a duress token and returns mode=duress', () => {
      const { token } = generateUserPassToken(seedSecret, personId, fixedNowMs, 30, 'duress');
      const result = verifyUserPassToken(token, seedSecret, fixedNowMs);

      expect(result.valid).toBe(true);
      expect(result.mode).toBe('duress');
    });

    it('rejects a token signed with a different seed (seed mismatch)', () => {
      const { token } = generateUserPassToken(seedSecret, personId, fixedNowMs);
      const result = verifyUserPassToken(token, 'WRONG_SECRET', fixedNowMs);

      expect(result.valid).toBe(false);
    });

    it('rejects a tampered token', () => {
      const { token } = generateUserPassToken(seedSecret, personId, fixedNowMs);
      const tampered = token.slice(0, -4) + 'XXXX';
      const result = verifyUserPassToken(tampered, seedSecret, fixedNowMs);

      expect(result.valid).toBe(false);
    });

    it('rejects a completely expired token (outside drift window)', () => {
      const { token } = generateUserPassToken(seedSecret, personId, fixedNowMs);
      // Move forward 5 minutes = 10 time buckets — well outside drift tolerance of ±1
      const futureMs = fixedNowMs + 5 * 60 * 1000;
      const result = verifyUserPassToken(token, seedSecret, futureMs);

      expect(result.valid).toBe(false);
    });

    it('accepts a token within allowed drift of ±1 bucket (clock skew)', () => {
      const { token } = generateUserPassToken(seedSecret, personId, fixedNowMs);
      // Move forward exactly 1 bucket (30 seconds) — within drift tolerance
      const driftedMs = fixedNowMs + 30 * 1000;
      const result = verifyUserPassToken(token, seedSecret, driftedMs);

      expect(result.valid).toBe(true);
    });
  });

  // ─── Visitor Pass Entity ─────────────────────────────────────────────────────

  describe('VisitorPass entity', () => {
    // Use real Date.now() so passes don't expire during test runs years after fixedNowMs
    const realNow = Date.now();
    const validFrom = new Date(realNow - 1000); // already started
    const validTo = new Date(realNow + 3600 * 1000); // 1 hour from now

    it('creates a visitor pass with status=active', () => {
      const pass = VisitorPass.create(personId, 'Carlos Visitante', validFrom, validTo, 3);

      expect(pass.status).toBe('active');
      expect(pass.usedCount).toBe(0);
      expect(pass.visitorName).toBe('Carlos Visitante');
    });

    it('generates a signed token for an active visitor pass', () => {
      const pass = VisitorPass.create(personId, 'Ana Invitada', validFrom, validTo, 2);
      const token = pass.generateToken(seedSecret);

      expect(token).toMatch(/^UMBRAL-VP-v1\./);
    });

    it('records uses and transitions to used status on max uses reached', () => {
      const pass = VisitorPass.create(personId, 'Luis Visitante', validFrom, validTo, 1);
      pass.recordUse();

      expect(pass.usedCount).toBe(1);
      expect(pass.status).toBe('used');
    });

    it('throws VisitorPassExpiredError when recording use on an exhausted pass', () => {
      const pass = VisitorPass.create(personId, 'María Visitante', validFrom, validTo, 1);
      pass.recordUse(); // exhausts the pass

      expect(() => pass.recordUse()).toThrow(VisitorPassExpiredError);
    });

    it('reports expired status for a pass with validTo in the past', () => {
      const pastFrom = new Date(fixedNowMs - 7200 * 1000);
      const pastTo = new Date(fixedNowMs - 3600 * 1000); // ended 1 hour ago

      const pass = VisitorPass.reconstitute({
        id: makeVisitorPassId('test-pass-001'),
        issuedByPersonId: personId,
        visitorName: 'Pedro Expirado',
        validFrom: pastFrom,
        validTo: pastTo,
        maxUses: 3,
        usedCount: 0,
        createdAt: new Date(fixedNowMs - 7200 * 1000),
      });

      expect(pass.status).toBe('expired');
      expect(() => pass.generateToken(seedSecret)).toThrow(VisitorPassExpiredError);
    });
  });

  // ─── ID Helpers ──────────────────────────────────────────────────────────────

  describe('ID branded types', () => {
    it('creates UserPassId from a string', () => {
      const id = makeUserPassId('user-pass-001');
      expect(id).toBe('user-pass-001');
    });

    it('creates VisitorPassId from a string', () => {
      const id = makeVisitorPassId('visitor-001');
      expect(id).toBe('visitor-001');
    });
  });
});
