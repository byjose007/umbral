import { DomainError } from '../topology/errors.js';

export { DomainError };

export class AccessRightsError extends DomainError {
  constructor(message: string, code = 'ACCESS_RIGHTS_ERROR') {
    super(code, message);
  }
}

export class InvalidTimeWindowError extends AccessRightsError {
  constructor(message = 'Invalid time window format or bounds') {
    super(message, 'INVALID_TIME_WINDOW');
  }
}

export class InvalidScheduleError extends AccessRightsError {
  constructor(message = 'Invalid schedule configuration') {
    super(message, 'INVALID_SCHEDULE');
  }
}

export class InvalidAccessLevelError extends AccessRightsError {
  constructor(message = 'Invalid access level entries') {
    super(message, 'INVALID_ACCESS_LEVEL');
  }
}
