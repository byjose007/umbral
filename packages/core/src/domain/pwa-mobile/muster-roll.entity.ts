import { ok, err, Result } from 'neverthrow';
import { MusterSessionId } from './ids.js';
import { SiteId } from '../topology/ids.js';
import { DomainError, MusterSessionError } from './errors.js';

export interface OccupantRecord {
  readonly personId: string;
  readonly pseudonym: string;
  readonly fullName?: string;
  readonly zoneId: string;
  readonly status: 'present_inside' | 'evacuated_accounted' | 'missing';
}

export interface MusterRollProps {
  readonly sessionId: MusterSessionId;
  readonly siteId: SiteId;
  readonly initiatedBy: string;
  readonly initiatedAt: Date;
  readonly occupants: readonly OccupantRecord[];
}

export class MusterRoll {
  private constructor(public readonly props: MusterRollProps) {}

  public static create(props: MusterRollProps): Result<MusterRoll, DomainError> {
    if (!props.sessionId) {
      return err(new MusterSessionError('Muster session ID is required'));
    }
    if (!props.siteId) {
      return err(new MusterSessionError('Site ID is required'));
    }

    return ok(new MusterRoll({
      ...props,
      initiatedAt: props.initiatedAt || new Date(),
      occupants: Object.freeze([...(props.occupants || [])]),
    }));
  }

  get sessionId(): MusterSessionId { return this.props.sessionId; }
  get siteId(): SiteId { return this.props.siteId; }
  get initiatedBy(): string { return this.props.initiatedBy; }
  get initiatedAt(): Date { return this.props.initiatedAt; }
  get occupants(): readonly OccupantRecord[] { return this.props.occupants; }

  public markEvacuated(personId: string): Result<MusterRoll, DomainError> {
    const occupant = this.props.occupants.find((o) => o.personId === personId);
    if (!occupant) {
      return err(new MusterSessionError(`Person ${personId} not found in site occupancy list`));
    }

    const updatedOccupants = this.props.occupants.map((o) =>
      o.personId === personId ? { ...o, status: 'evacuated_accounted' as const } : o
    );

    return ok(new MusterRoll({
      ...this.props,
      occupants: Object.freeze(updatedOccupants),
    }));
  }

  public getHeadcount() {
    const totalInside = this.props.occupants.length;
    const evacuatedCount = this.props.occupants.filter((o) => o.status === 'evacuated_accounted').length;
    const missingCount = totalInside - evacuatedCount;

    return {
      totalInside,
      evacuatedCount,
      missingCount,
    };
  }
}
