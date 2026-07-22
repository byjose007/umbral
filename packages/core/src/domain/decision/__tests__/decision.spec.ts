import { describe, it, expect } from 'vitest';
import { makeDoorId, makeReaderId } from '../../topology/ids.js';
import { evaluateAccess } from '../evaluate.js';
import { compileAccessMatrix } from '../matrix-compiler.js';
import { detectImpossibleTravel, evaluateAPB } from '../apb-evaluator.js';
import { LocalAccessState } from '../types.js';

describe('Decision Engine Pure Domain', () => {
  const doorId = makeDoorId('door-101');
  const readerId = makeReaderId('reader-1');

  const compiledMatrix = compileAccessMatrix({
    controllerId: 'ctrl-1',
    matrixVersion: 1,
    userAccessLevels: [
      {
        personId: 'p-1',
        credentialHash: 'hash-active-user',
        normalPin: '1234',
        duressPin: '9999',
        doors: [
          {
            doorId,
            windows: [
              { dayOfWeek: 4, startMinute: 420, endMinute: 1140 }, // Thursday 7:00-19:00
            ],
          },
        ],
      },
      {
        personId: 'p-vacation',
        credentialHash: 'hash-vacation-user',
        hasActiveAbsenceBlocking: true,
        doors: [
          {
            doorId,
            windows: [{ dayOfWeek: 4, startMinute: 0, endMinute: 1439 }],
          },
        ],
      },
      {
        personId: 'p-blocked',
        credentialHash: 'hash-blocked-user',
        isBlocked: true,
        doors: [
          {
            doorId,
            windows: [{ dayOfWeek: 4, startMinute: 0, endMinute: 1439 }],
          },
        ],
      },
      {
        personId: 'p-expired-doc',
        credentialHash: 'hash-expired-doc-user',
        hasExpiredDocuments: true,
        doors: [
          {
            doorId,
            windows: [{ dayOfWeek: 4, startMinute: 0, endMinute: 1439 }],
          },
        ],
      },
    ],
  });

  const baseLocalState: LocalAccessState = {
    matrix: compiledMatrix,
    offlineMode: 'cached',
    isOffline: false,
  };

  it('grants access for active user within schedule window', () => {
    const at = new Date('2026-07-23T10:00:00.000Z'); // Thursday 10:00 UTC
    const decision = evaluateAccess({
      credentialHash: 'hash-active-user',
      doorId,
      readerId,
      at,
      localState: baseLocalState,
    });

    expect(decision.kind).toBe('granted');
    if (decision.kind === 'granted') {
      expect(decision.reasonCode).toBe('SCHEDULE_MATCH');
    }
  });

  it('denies unknown credential', () => {
    const at = new Date('2026-07-23T10:00:00.000Z');
    const decision = evaluateAccess({
      credentialHash: 'hash-unknown',
      doorId,
      readerId,
      at,
      localState: baseLocalState,
    });

    expect(decision.kind).toBe('denied');
    if (decision.kind === 'denied') {
      expect(decision.reasonCode).toBe('UNKNOWN_CREDENTIAL');
    }
  });

  it('denies access when user has an active blocking absence', () => {
    const at = new Date('2026-07-23T10:00:00.000Z');
    const decision = evaluateAccess({
      credentialHash: 'hash-vacation-user',
      doorId,
      readerId,
      at,
      localState: baseLocalState,
    });

    expect(decision.kind).toBe('denied');
    if (decision.kind === 'denied') {
      expect(decision.reasonCode).toBe('ABSENCE_ACTIVE');
    }
  });

  it('denies access when credential is blocked', () => {
    const at = new Date('2026-07-23T10:00:00.000Z');
    const decision = evaluateAccess({
      credentialHash: 'hash-blocked-user',
      doorId,
      readerId,
      at,
      localState: baseLocalState,
    });

    expect(decision.kind).toBe('denied');
    if (decision.kind === 'denied') {
      expect(decision.reasonCode).toBe('CREDENTIAL_BLOCKED');
    }
  });

  it('denies access when user has expired required documents', () => {
    const at = new Date('2026-07-23T10:00:00.000Z');
    const decision = evaluateAccess({
      credentialHash: 'hash-expired-doc-user',
      doorId,
      readerId,
      at,
      localState: baseLocalState,
    });

    expect(decision.kind).toBe('denied');
    if (decision.kind === 'denied') {
      expect(decision.reasonCode).toBe('DOCUMENT_EXPIRED');
    }
  });

  it('grants access physically with silent duress alarm when duress PIN is presented', () => {
    const at = new Date('2026-07-23T10:00:00.000Z');
    const decision = evaluateAccess({
      credentialHash: 'hash-active-user',
      doorId,
      readerId,
      at,
      localState: baseLocalState,
      presentedPin: '9999',
    });

    expect(decision.kind).toBe('granted');
    if (decision.kind === 'granted') {
      expect(decision.reasonCode).toBe('DURESS_MATCH');
      expect(decision.silentAlarm).toBe('duress');
    }
  });

  it('evaluates Anti-Passback hard and soft modes', () => {
    const at = new Date('2026-07-23T10:00:00.000Z');
    const apbState = {
      'hash-active-user': {
        lastZoneId: 'z-secure',
        lastReaderId: 'r-in',
        lastTimestamp: at.toISOString(),
      },
    };

    const hardRes = evaluateAPB('hash-active-user', 'z-secure', 'hard', 300, apbState, at);
    expect(hardRes.isViolation).toBe(true);
    expect(hardRes.shouldDeny).toBe(true);

    const softRes = evaluateAPB('hash-active-user', 'z-secure', 'soft', 300, apbState, at);
    expect(softRes.isViolation).toBe(true);
    expect(softRes.shouldDeny).toBe(false);
  });

  it('detects impossible travel when credential appears at distant readers within seconds', () => {
    const t1 = new Date('2026-07-23T10:00:00.000Z');
    const t2 = new Date('2026-07-23T10:00:10.000Z'); // 10 seconds later

    const isImpossible = detectImpossibleTravel(t1, 'reader-site-A', t2, 'reader-site-B', 300);
    expect(isImpossible).toBe(true);
  });

  it('respects offline_mode deny_all and unlocked when offline', () => {
    const at = new Date('2026-07-23T10:00:00.000Z');

    const denyAllState: LocalAccessState = {
      matrix: compiledMatrix,
      offlineMode: 'deny_all',
      isOffline: true,
    };
    const denyRes = evaluateAccess({
      credentialHash: 'hash-active-user',
      doorId,
      readerId,
      at,
      localState: denyAllState,
    });
    expect(denyRes.kind).toBe('denied');
    if (denyRes.kind === 'denied') expect(denyRes.reasonCode).toBe('OFFLINE_DENY_ALL');

    const unlockedState: LocalAccessState = {
      matrix: compiledMatrix,
      offlineMode: 'unlocked',
      isOffline: true,
    };
    const unlockRes = evaluateAccess({
      credentialHash: 'hash-active-user',
      doorId,
      readerId,
      at,
      localState: unlockedState,
    });
    expect(unlockRes.kind).toBe('granted');
    if (unlockRes.kind === 'granted') expect(unlockRes.reasonCode).toBe('UNLOCKED_MODE');
  });
});
