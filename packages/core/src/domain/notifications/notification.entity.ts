import { ok, err, Result } from 'neverthrow';
import { DomainError, NotificationError } from './errors.js';

export type NotificationChannel = 'whatsapp' | 'email' | 'webpush';
export type NotificationStatus = 'queued' | 'sent' | 'failed' | 'retrying';

export interface NotificationMessageProps {
  readonly id: string;
  readonly alertId: string;
  readonly channel: NotificationChannel;
  readonly recipientRole: string;
  readonly recipientTarget: string; // e.g. phone number, email address, or device token
  readonly locale: 'es' | 'en';
  readonly templateId: string;
  readonly payload: Record<string, unknown>;
  readonly idempotencyKey: string;
  readonly status?: NotificationStatus;
  readonly retryCount?: number;
  readonly createdAt?: Date;
  readonly sentAt?: Date;
}

export class NotificationMessage {
  private constructor(public readonly props: NotificationMessageProps) {}

  public static generateIdempotencyKey(
    alertId: string,
    recipientTarget: string,
    channel: NotificationChannel
  ): string {
    return `${alertId}:${recipientTarget.trim().toLowerCase()}:${channel}`;
  }

  public static create(props: NotificationMessageProps): Result<NotificationMessage, DomainError> {
    if (!props.id) {
      return err(new NotificationError('Notification ID is required'));
    }
    if (!props.alertId) {
      return err(new NotificationError('Alert ID is required'));
    }
    if (!props.recipientTarget) {
      return err(new NotificationError('Recipient target is required'));
    }
    if (!props.idempotencyKey) {
      return err(new NotificationError('Idempotency key is required'));
    }

    return ok(
      new NotificationMessage({
        ...props,
        status: props.status ?? 'queued',
        retryCount: props.retryCount ?? 0,
        createdAt: props.createdAt ?? new Date(),
      })
    );
  }

  get id(): string { return this.props.id; }
  get alertId(): string { return this.props.alertId; }
  get channel(): NotificationChannel { return this.props.channel; }
  get recipientRole(): string { return this.props.recipientRole; }
  get recipientTarget(): string { return this.props.recipientTarget; }
  get locale(): 'es' | 'en' { return this.props.locale; }
  get templateId(): string { return this.props.templateId; }
  get payload(): Record<string, unknown> { return this.props.payload; }
  get idempotencyKey(): string { return this.props.idempotencyKey; }
  get status(): NotificationStatus { return this.props.status ?? 'queued'; }
  get retryCount(): number { return this.props.retryCount ?? 0; }
  get createdAt(): Date { return this.props.createdAt ?? new Date(); }
  get sentAt(): Date | undefined { return this.props.sentAt; }

  public markSent(): NotificationMessage {
    return new NotificationMessage({
      ...this.props,
      status: 'sent',
      sentAt: new Date(),
    });
  }

  public markFailed(maxRetries = 3): NotificationMessage {
    const nextRetry = this.retryCount + 1;
    const isFinalFailure = nextRetry >= maxRetries;
    return new NotificationMessage({
      ...this.props,
      status: isFinalFailure ? 'failed' : 'retrying',
      retryCount: nextRetry,
    });
  }
}
