import { ok, err, Result } from 'neverthrow';
import { AlertRuleId } from './ids.js';
import { SiteId } from '../topology/ids.js';
import { EventType, EventSeverity } from '../events-audit/taxonomy.js';
import { DomainError, InvalidAlertRuleError } from './errors.js';

export interface AlertRuleProps {
  readonly id: AlertRuleId;
  readonly siteId: SiteId;
  readonly name: string;
  readonly eventType: EventType;
  readonly severity: EventSeverity;
  readonly dedupWindowSec: number;
  readonly escalationSec?: number | null;
  readonly preAlarmSec?: number | null;
  readonly channels: readonly string[];
  readonly createdAt?: Date;
}

export class AlertRule {
  private constructor(public readonly props: AlertRuleProps) {}

  public static create(props: AlertRuleProps): Result<AlertRule, DomainError> {
    if (!props.id) {
      return err(new InvalidAlertRuleError('Alert rule ID is required'));
    }
    if (!props.siteId) {
      return err(new InvalidAlertRuleError('Site ID is required'));
    }
    if (!props.name || props.name.trim().length === 0) {
      return err(new InvalidAlertRuleError('Alert rule name cannot be empty'));
    }
    if (props.dedupWindowSec < 0) {
      return err(new InvalidAlertRuleError('Deduplication window seconds cannot be negative'));
    }

    return ok(new AlertRule({
      id: props.id,
      siteId: props.siteId,
      name: props.name.trim(),
      eventType: props.eventType,
      severity: props.severity || 'warning',
      dedupWindowSec: props.dedupWindowSec ?? 60,
      escalationSec: props.escalationSec ?? null,
      preAlarmSec: props.preAlarmSec ?? null,
      channels: Object.freeze([...(props.channels || ['websocket'])]),
      createdAt: props.createdAt ?? new Date(),
    }));
  }

  get id(): AlertRuleId { return this.props.id; }
  get siteId(): SiteId { return this.props.siteId; }
  get name(): string { return this.props.name; }
  get eventType(): EventType { return this.props.eventType; }
  get severity(): EventSeverity { return this.props.severity; }
  get dedupWindowSec(): number { return this.props.dedupWindowSec; }
  get escalationSec(): number | null { return this.props.escalationSec ?? null; }
  get preAlarmSec(): number | null { return this.props.preAlarmSec ?? null; }
  get channels(): readonly string[] { return this.props.channels; }
}
