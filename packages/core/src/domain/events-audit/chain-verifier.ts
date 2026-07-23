import { ok, err, Result } from 'neverthrow';
import { AccessEvent } from './access-event.entity.js';
import { HashChainTamperedError } from './errors.js';
import { GENESIS_HASH } from './hash-chain.js';

export interface ChainVerificationSuccess {
  readonly verifiedCount: number;
  readonly partition: string;
  readonly startSequenceNumber: number;
  readonly endSequenceNumber: number;
}

export function verifyEventChain(
  events: readonly AccessEvent[],
  expectedStartHash?: string
): Result<ChainVerificationSuccess, HashChainTamperedError> {
  if (events.length === 0) {
    return ok({
      verifiedCount: 0,
      partition: 'empty',
      startSequenceNumber: 0,
      endSequenceNumber: 0,
    });
  }

  // Ensure events are ordered by sequenceNumber
  const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const first = sorted[0]!;

  let previousHash = expectedStartHash ?? (first.sequenceNumber === 1 ? GENESIS_HASH : first.previousHash);

  for (const event of sorted) {
    // 1. Verify previous hash link
    if (event.previousHash !== previousHash) {
      return err(new HashChainTamperedError(event.sequenceNumber, event.id));
    }

    // 2. Verify self-hash integrity
    if (!event.verifyHash()) {
      return err(new HashChainTamperedError(event.sequenceNumber, event.id));
    }

    previousHash = event.currentHash;
  }

  return ok({
    verifiedCount: sorted.length,
    partition: first.chainPartition,
    startSequenceNumber: first.sequenceNumber,
    endSequenceNumber: sorted[sorted.length - 1]!.sequenceNumber,
  });
}
