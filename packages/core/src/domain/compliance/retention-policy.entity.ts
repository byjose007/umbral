import { ok, err, Result } from 'neverthrow';
import { RetentionPolicyId } from './ids.js';
import { DomainError, ComplianceError } from './errors.js';

export type ComplianceDataType =
  | 'visitor_photo'
  | 'access_event'
  | 'video_clip'
  | 'person_pii'
  | 'pii_access_audit';

export interface RetentionPolicyProps {
  readonly id: RetentionPolicyId;
  readonly dataType: ComplianceDataType;
  readonly retentionDays: number;
  readonly autoPurgeEnabled: boolean;
  readonly description?: string;
  readonly updatedAt: Date;
}

export interface PurgeableItem {
  readonly id: string;
  readonly dataType: ComplianceDataType;
  readonly createdAt: Date;
}

export interface PurgeSummary {
  readonly dataType: ComplianceDataType;
  readonly cutoffDate: Date;
  readonly purgedCount: number;
  readonly remainingCount: number;
  readonly purgedIds: string[];
}

export class RetentionPolicy {
  private constructor(public readonly props: RetentionPolicyProps) {}

  public static create(props: RetentionPolicyProps): Result<RetentionPolicy, DomainError> {
    if (!props.id) {
      return err(new ComplianceError('Retention policy ID is required'));
    }
    if (props.retentionDays < 1) {
      return err(new ComplianceError('Retention days must be at least 1 day'));
    }

    return ok(new RetentionPolicy({
      ...props,
      description: props.description ?? `Retention policy for ${props.dataType}`,
    }));
  }

  get id(): RetentionPolicyId { return this.props.id; }
  get dataType(): ComplianceDataType { return this.props.dataType; }
  get retentionDays(): number { return this.props.retentionDays; }
  get autoPurgeEnabled(): boolean { return this.props.autoPurgeEnabled; }
  get description(): string { return this.props.description ?? ''; }
  get updatedAt(): Date { return this.props.updatedAt; }

  public calculateCutoffDate(referenceDate: Date = new Date()): Date {
    const cutoff = new Date(referenceDate.getTime());
    cutoff.setDate(cutoff.getDate() - this.props.retentionDays);
    return cutoff;
  }

  public isExpired(createdAt: Date, referenceDate: Date = new Date()): boolean {
    const cutoff = this.calculateCutoffDate(referenceDate);
    return createdAt < cutoff;
  }

  public executePurge(items: PurgeableItem[], referenceDate: Date = new Date()): PurgeSummary {
    if (!this.props.autoPurgeEnabled) {
      return {
        dataType: this.props.dataType,
        cutoffDate: this.calculateCutoffDate(referenceDate),
        purgedCount: 0,
        remainingCount: items.length,
        purgedIds: [],
      };
    }

    const cutoff = this.calculateCutoffDate(referenceDate);
    const purgedIds: string[] = [];
    let remainingCount = 0;

    for (const item of items) {
      if (item.dataType === this.props.dataType && item.createdAt < cutoff) {
        purgedIds.push(item.id);
      } else {
        remainingCount++;
      }
    }

    return {
      dataType: this.props.dataType,
      cutoffDate: cutoff,
      purgedCount: purgedIds.length,
      remainingCount,
      purgedIds,
    };
  }
}
