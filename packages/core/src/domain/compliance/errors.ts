export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ComplianceError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class RetentionPolicyNotFoundError extends ComplianceError {
  constructor(id: string) {
    super(`Retention policy '${id}' not found`);
  }
}

export class UnauthorizedPiiAccessError extends ComplianceError {
  constructor(operatorId: string, resource: string) {
    super(`Operator '${operatorId}' is not authorized to access PII resource '${resource}'`);
  }
}

export class ArcoProcessingError extends ComplianceError {
  constructor(reason: string) {
    super(`ARCO operation failed: ${reason}`);
  }
}

export class InvalidPrivacyNoticeError extends ComplianceError {
  constructor(reason: string) {
    super(`Privacy notice error: ${reason}`);
  }
}
