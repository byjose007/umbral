import { DomainError } from '../topology/errors.js';

export { DomainError };

export class NotificationError extends DomainError {
  constructor(message: string, code = 'NOTIFICATION_ERROR') {
    super(code, message);
  }
}

export class ChannelDispatchError extends NotificationError {
  constructor(channel: string, details: string) {
    super(`Failed to dispatch message via channel ${channel}: ${details}`, 'CHANNEL_DISPATCH_ERROR');
  }
}

export class TemplateNotFoundError extends NotificationError {
  constructor(templateId: string, locale: string) {
    super(`Template '${templateId}' for locale '${locale}' was not found`, 'TEMPLATE_NOT_FOUND');
  }
}

export class IdempotencyError extends NotificationError {
  constructor(idempotencyKey: string) {
    super(`Duplicate notification dispatch detected for idempotency key: ${idempotencyKey}`, 'DUPLICATE_NOTIFICATION');
  }
}
