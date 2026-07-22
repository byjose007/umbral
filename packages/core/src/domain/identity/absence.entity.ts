import { ok, err, Result } from 'neverthrow';
import { AbsenceId, PersonId } from './ids.js';
import { DomainError, InvalidAbsenceError } from './errors.js';

export type AbsenceType = 'vacation' | 'leave' | 'medical' | 'suspension';

export interface AbsenceProps {
  readonly id: AbsenceId;
  readonly personId: PersonId;
  readonly absenceType: AbsenceType;
  readonly validFrom: Date;
  readonly validUntil: Date;
  readonly blocksAccess: boolean;
  readonly reason?: string | null;
  readonly createdAt?: Date;
}

export class Absence {
  private constructor(public readonly props: AbsenceProps) {}

  public static create(props: AbsenceProps): Result<Absence, DomainError> {
    if (!props.id) {
      return err(new InvalidAbsenceError('Absence ID is required'));
    }
    if (!props.personId) {
      return err(new InvalidAbsenceError('Person ID is required'));
    }
    if (!props.validFrom || isNaN(props.validFrom.getTime())) {
      return err(new InvalidAbsenceError('Valid from date is invalid'));
    }
    if (!props.validUntil || isNaN(props.validUntil.getTime())) {
      return err(new InvalidAbsenceError('Valid until date is invalid'));
    }
    if (props.validUntil < props.validFrom) {
      return err(new InvalidAbsenceError('Valid until date cannot be before valid from date'));
    }

    return ok(new Absence({
      id: props.id,
      personId: props.personId,
      absenceType: props.absenceType || 'vacation',
      validFrom: props.validFrom,
      validUntil: props.validUntil,
      blocksAccess: props.blocksAccess ?? true,
      reason: props.reason?.trim() || null,
      createdAt: props.createdAt ?? new Date(),
    }));
  }

  get id(): AbsenceId { return this.props.id; }
  get personId(): PersonId { return this.props.personId; }
  get absenceType(): AbsenceType { return this.props.absenceType; }
  get validFrom(): Date { return this.props.validFrom; }
  get validUntil(): Date { return this.props.validUntil; }
  get blocksAccess(): boolean { return this.props.blocksAccess; }
  get reason(): string | null { return this.props.reason ?? null; }

  public isActiveAt(at: Date): boolean {
    const time = at.getTime();
    return time >= this.validFrom.getTime() && time <= this.validUntil.getTime();
  }

  public isBlockingAt(at: Date): boolean {
    return this.blocksAccess && this.isActiveAt(at);
  }
}
