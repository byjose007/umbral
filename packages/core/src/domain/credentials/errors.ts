import { DomainError } from '../topology/errors.js';

export { DomainError };

export class CredentialError extends DomainError {
  constructor(message: string, code = 'CREDENTIAL_ERROR') {
    super(code, message);
  }
}

export class DuplicateCredentialError extends CredentialError {
  constructor(message = 'Credential hash already exists') {
    super(message, 'DUPLICATE_CREDENTIAL');
  }
}

export class CredentialBlockedError extends CredentialError {
  constructor(message = 'Credential is currently blocked') {
    super(message, 'CREDENTIAL_BLOCKED');
  }
}

export class InvalidCredentialTypeError extends CredentialError {
  constructor(message = 'Invalid or unsupported credential type') {
    super(message, 'INVALID_CREDENTIAL_TYPE');
  }
}

export class ProhibitedTechnologyError extends CredentialError {
  constructor(message = 'Use of 125 kHz or MIFARE Classic is strictly prohibited by security invariant') {
    super(message, 'PROHIBITED_TECHNOLOGY');
  }
}
