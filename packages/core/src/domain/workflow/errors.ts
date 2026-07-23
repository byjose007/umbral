import { DomainError } from '../topology/errors.js';

export { DomainError };

export class WorkflowError extends DomainError {
  constructor(message: string, code = 'WORKFLOW_ERROR') {
    super(code, message);
  }
}

export class InvalidAccessRequestError extends WorkflowError {
  constructor(message = 'Invalid access request data') {
    super(message, 'INVALID_ACCESS_REQUEST');
  }
}

export class InvalidAccessRequestTransitionError extends WorkflowError {
  constructor(message = 'Invalid access request state transition') {
    super(message, 'INVALID_ACCESS_REQUEST_TRANSITION');
  }
}

export class MissingRequiredDocumentError extends WorkflowError {
  constructor(message = 'Required document is missing or expired') {
    super(message, 'MISSING_REQUIRED_DOCUMENT');
  }
}
