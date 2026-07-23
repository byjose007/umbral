import { DomainError } from '../topology/errors.js';

export { DomainError };

export class EventsAuditError extends DomainError {
  constructor(message: string, code = 'EVENTS_AUDIT_ERROR') {
    super(code, message);
  }
}

export class HashChainTamperedError extends EventsAuditError {
  constructor(
    public readonly brokenSequenceNumber: number,
    public readonly brokenEventId: string,
    message = `Hash chain integrity verification failed at sequence #${brokenSequenceNumber} (Event ID: ${brokenEventId})`
  ) {
    super(message, 'HASH_CHAIN_TAMPERED');
  }
}

export class InvalidEventTypeError extends EventsAuditError {
  constructor(message = 'Invalid or unrecognized event type in PACS taxonomy') {
    super(message, 'INVALID_EVENT_TYPE');
  }
}
