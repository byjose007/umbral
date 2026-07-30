import { DomainError } from '../topology/errors.js';

export { DomainError };

export class InvalidOperatorError extends DomainError {
  constructor(message = 'Invalid operator parameters') {
    super('INVALID_OPERATOR', message);
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor(message = 'Invalid email or password') {
    super('INVALID_CREDENTIALS', message);
  }
}

export class OperatorDisabledError extends DomainError {
  constructor(message = 'Operator account is disabled') {
    super('OPERATOR_DISABLED', message);
  }
}

export class InvalidRefreshTokenError extends DomainError {
  constructor(message = 'Refresh token is invalid, expired or revoked') {
    super('INVALID_REFRESH_TOKEN', message);
  }
}
