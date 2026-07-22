import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateAccess } from '../evaluate.js';
import { compileAccessMatrix } from '../matrix-compiler.js';
import { makeDoorId, makeReaderId } from '../../topology/ids.js';
import { LocalAccessState } from '../types.js';

interface TestCase {
  id: string;
  description: string;
  input: {
    credentialHash: string;
    doorId: string;
    readerId: string;
    at: string;
    presentedPin: string | null;
  };
  expected: {
    kind: 'granted' | 'denied';
    reasonCode: string;
    silentAlarm?: string;
  };
}

describe('Shared Decision Vector Parity Runner', () => {
  const doorId = makeDoorId('door-101');

  const compiledMatrix = compileAccessMatrix({
    controllerId: 'ctrl-1',
    matrixVersion: 1,
    userAccessLevels: [
      {
        personId: 'p-1',
        credentialHash: 'hash-user-1',
        doors: [
          {
            doorId,
            windows: [{ dayOfWeek: 4, startMinute: 420, endMinute: 1140 }],
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
        personId: 'p-expired',
        credentialHash: 'hash-expired-user',
        validUntil: '2026-01-01T00:00:00.000Z',
        doors: [
          {
            doorId,
            windows: [{ dayOfWeek: 4, startMinute: 0, endMinute: 1439 }],
          },
        ],
      },
      {
        personId: 'p-duress',
        credentialHash: 'hash-duress-user',
        duressPin: '9999',
        doors: [
          {
            doorId,
            windows: [{ dayOfWeek: 4, startMinute: 0, endMinute: 1439 }],
          },
        ],
      },
    ],
  });

  const localState: LocalAccessState = {
    matrix: compiledMatrix,
    offlineMode: 'cached',
    isOffline: false,
  };

  const vectorPath = join(process.cwd(), 'test/fixtures/decision-vectors/vector-cases.json');
  const rawVector = readFileSync(vectorPath, 'utf-8');
  const testCases: TestCase[] = JSON.parse(rawVector);

  it.each(testCases)('executes case $id: $description', (tc) => {
    const decision = evaluateAccess({
      credentialHash: tc.input.credentialHash,
      doorId: makeDoorId(tc.input.doorId),
      readerId: makeReaderId(tc.input.readerId),
      at: new Date(tc.input.at),
      localState,
      presentedPin: tc.input.presentedPin ?? undefined,
    });

    expect(decision.kind).toBe(tc.expected.kind);
    if (decision.kind === 'granted') {
      expect(decision.reasonCode).toBe(tc.expected.reasonCode);
      if (tc.expected.silentAlarm) {
        expect(decision.silentAlarm).toBe(tc.expected.silentAlarm);
      }
    } else if (decision.kind === 'denied') {
      expect(decision.reasonCode).toBe(tc.expected.reasonCode);
    }
  });
});
