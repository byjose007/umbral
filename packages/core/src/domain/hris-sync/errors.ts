export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class HrisSyncError extends DomainError {
  constructor(message: string) {
    super(message);
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
