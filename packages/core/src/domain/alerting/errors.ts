import { DomainError } from '../topology/errors.js';

export { DomainError };

export class AlertingError extends DomainError {
  constructor(message: string, code = 'ALERTING_ERROR') {
    super(code, message);
  }
}

export class InvalidAlertRuleError extends AlertingError {
  constructor(message = 'Invalid alert rule parameters') {
    super(message, 'INVALID_ALERT_RULE');
  }
}

export class AlertAlreadyAcknowledgedError extends AlertingError {
  constructor(message = 'Alert has already been acknowledged') {
    super(message, 'ALERT_ALREADY_ACKNOWLEDGED');
  }
}
