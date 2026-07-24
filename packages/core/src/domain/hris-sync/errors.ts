import { DomainError } from '../topology/errors.js';
export { DomainError };

export class HrisSyncError extends DomainError {
  constructor(message: string) {
    super('HRIS_SYNC_ERROR', message);
    this.name = 'HrisSyncError';
  }
}

export class HrisParsingError extends HrisSyncError {
  constructor(reason: string) {
    super(`HRIS CSV parsing failed: ${reason}`);
  }
}

export class HrisReconciliationError extends HrisSyncError {
  constructor(externalRef: string, reason: string) {
    super(`Reconciliation failed for external_ref '${externalRef}': ${reason}`);
  }
}
