import { DomainError } from '../topology/errors.js';

export { DomainError };

export class UserPassError extends DomainError {
  constructor(message: string, code = 'USER_PASS_ERROR') {
    super(code, message);
  }
}

export class InvalidPassSeedError extends UserPassError {
  constructor(message = 'User pass seed is missing or invalid for this person') {
    super(message, 'INVALID_PASS_SEED_ERROR');
  }
}

export class VisitorPassExpiredError extends UserPassError {
  constructor(message = 'Visitor guest pass has expired or reached its maximum use limit') {
    super(message, 'VISITOR_PASS_EXPIRED_ERROR');
  }
}

export class DuressTokenError extends UserPassError {
  constructor(message = 'Duress token generation requires an authenticated session') {
    super(message, 'DURESS_TOKEN_ERROR');
  }
}
