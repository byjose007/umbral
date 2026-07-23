import { describe, it, expect } from 'vitest';
import { AccessEvent } from '../access-event.entity.js';
import { computeEventHash, GENESIS_HASH } from '../hash-chain.js';
import { verifyEventChain } from '../chain-verifier.js';
import { makeAccessEventId } from '../ids.js';
import { makeSiteId, makeDoorId, makeControllerId } from '../../topology/ids.js';
import { makePersonId } from '../../identity/ids.js';
import { makeCredentialId } from '../../credentials/ids.js';

describe('Events & Audit Domain', () => {
  const siteId = makeSiteId('site-01');
  const doorId = makeDoorId('door-01');
  const controllerId = makeControllerId('ctrl-01');
  const personId = makePersonId('person-01');
  const credentialId = makeCredentialId('cred-01');

  it('computes hash chain sequentially for events', () => {
    const time1 = '2026-07-15T10:00:00.000Z';
    const id1 = makeAccessEventId('evt-1');
    const details1 = { reason: 'card_scanned' };
    const hash1 = computeEventHash(GENESIS_HASH, id1, time1, 'access.granted', JSON.stringify(details1));

    const e1 = AccessEvent.create({
      id: id1,
      chainPartition: controllerId,
      sequenceNumber: 1,
      previousHash: GENESIS_HASH,
      currentHash: hash1,
      eventType: 'access.granted',
      siteId,
      doorId,
      controllerId,
      personId,
      credentialId,
      direction: 'in',
      details: details1,
      timestamp: new Date(time1),
    })._unsafeUnwrap();

    expect(e1.verifyHash()).toBe(true);

    const time2 = '2026-07-15T10:05:00.000Z';
    const id2 = makeAccessEventId('evt-2');
    const details2 = { dpsState: 'open' };
    const hash2 = computeEventHash(e1.currentHash, id2, time2, 'door.opened', JSON.stringify(details2));

    const e2 = AccessEvent.create({
      id: id2,
      chainPartition: controllerId,
      sequenceNumber: 2,
      previousHash: e1.currentHash,
      currentHash: hash2,
      eventType: 'door.opened',
      siteId,
      doorId,
      controllerId,
      details: details2,
      timestamp: new Date(time2),
    })._unsafeUnwrap();

    expect(e2.verifyHash()).toBe(true);

    const verification = verifyEventChain([e1, e2]);
    expect(verification.isOk()).toBe(true);
    if (verification.isOk()) {
      expect(verification.value.verifiedCount).toBe(2);
    }
  });

  it('detects intermediate event tampering and identifies broken sequence link', () => {
    const time1 = '2026-07-15T10:00:00.000Z';
    const id1 = makeAccessEventId('evt-1');
    const hash1 = computeEventHash(GENESIS_HASH, id1, time1, 'access.granted', JSON.stringify({}));
    const e1 = AccessEvent.create({
      id: id1,
      chainPartition: controllerId,
      sequenceNumber: 1,
      previousHash: GENESIS_HASH,
      currentHash: hash1,
      eventType: 'access.granted',
      siteId,
      timestamp: new Date(time1),
    })._unsafeUnwrap();

    const time2 = '2026-07-15T10:05:00.000Z';
    const id2 = makeAccessEventId('evt-2');
    const hash2 = computeEventHash(e1.currentHash, id2, time2, 'access.denied', JSON.stringify({}));

    // Tampered event 2 (someone modified details or currentHash)
    const tamperedE2 = AccessEvent.create({
      id: id2,
      chainPartition: controllerId,
      sequenceNumber: 2,
      previousHash: e1.currentHash,
      currentHash: 'TAMPERED_FAKE_HASH_1234567890',
      eventType: 'access.denied',
      siteId,
      timestamp: new Date(time2),
    })._unsafeUnwrap();

    const verification = verifyEventChain([e1, tamperedE2]);
    expect(verification.isErr()).toBe(true);
    if (verification.isErr()) {
      expect(verification.error.code).toBe('HASH_CHAIN_TAMPERED');
      expect(verification.error.brokenSequenceNumber).toBe(2);
    }
  });
});
