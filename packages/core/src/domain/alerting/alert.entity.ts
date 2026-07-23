import { ok, err, Result } from 'neverthrow';
import { AlertId, AlertRuleId } from './ids.js';
import { SiteId, DoorId } from '../topology/ids.js';
import { EventType, EventSeverity } from '../events-audit/taxonomy.js';
import { DomainError, AlertingError, AlertAlreadyAcknowledgedError } from './errors.js';
import { pseudonymizePersonId } from './pseudonymizer.js';

export type AlertStatus = 'active' | 'acknowledged' | 'escalated' | 'cleared';

export interface AlertProps {
  readonly id: AlertId;
  readonly ruleId?: AlertRuleId | null;
  readonly siteId: SiteId;
  readonly doorId?: DoorId | null;
  readonly eventType: EventType;
  readonly severity: EventSeverity;
  readonly status: AlertStatus;
  readonly acknowledgedBy?: string | null;
  readonly acknowledgedAt?: Date | null;
  readonly pseudonymizedPersonId?: string | null;
  readonly rawPersonId?: string | null; // Keeps original personId for audited lookup only
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
  readonly createdAt?: Date;
}

export class Alert {
  private constructor(public readonly props: AlertProps) {}

  public static create(props: AlertProps): Result<Alert, DomainError> {
    if (!props.id) {
      return err(new AlertingError('Alert ID is required'));
    }
    if (!props.siteId) {
      return err(new AlertingError('Site ID is required'));
    }

    const pseudoId = props.pseudonymizedPersonId ?? pseudonymizePersonId(props.rawPersonId);

    return ok(new Alert({
      ...props,
      ruleId: props.ruleId ?? null,
      doorId: props.doorId ?? null,
      status: props.status || 'active',
      acknowledgedBy: props.acknowledgedBy ?? null,
      acknowledgedAt: props.acknowledgedAt ?? null,
      pseudonymizedPersonId: pseudoId,
      rawPersonId: props.rawPersonId ?? null,
      details: props.details ?? {},
      createdAt: props.createdAt ?? new Date(),
    }));
  }

  get id(): AlertId { return this.props.id; }
  get siteId(): SiteId { return this.props.siteId; }
  get doorId(): DoorId | null { return this.props.doorId ?? null; }
  get eventType(): EventType { return this.props.eventType; }
  get severity(): EventSeverity { return this.props.severity; }
  get status(): AlertStatus { return this.props.status; }
  get acknowledgedBy(): string | null { return this.props.acknowledgedBy ?? null; }
  get acknowledgedAt(): Date | null { return this.props.acknowledgedAt ?? null; }
  get pseudonymizedPersonId(): string | null { return this.props.pseudonymizedPersonId ?? null; }
  get rawPersonId(): string | null { return this.props.rawPersonId ?? null; }
  get timestamp(): Date { return this.props.timestamp; }

  public acknowledge(byUser: string, at: Date = new Date()): Result<Alert, DomainError> {
    if (this.props.status === 'acknowledged') {
      return err(new AlertAlreadyAcknowledgedError());
    }
    if (!byUser || byUser.trim().length === 0) {
      return err(new AlertingError('Acknowledging user is required'));
    }

    return ok(new Alert({
      ...this.props,
      status: 'acknowledged',
      acknowledgedBy: byUser.trim(),
      acknowledgedAt: at,
    }));
  }

  public escalate(at: Date = new Date()): Result<Alert, DomainError> {
    if (this.props.status === 'acknowledged' || this.props.status === 'cleared') {
      return err(new AlertingError(`Cannot escalate alert in ${this.props.status} status`));
    }

    return ok(new Alert({
      ...this.props,
      status: 'escalated',
    }));
  }
}
