import { ok, err, Result } from 'neverthrow';
import { EmploymentPeriodId, PersonId } from './ids.js';
import { DomainError, InvalidEmploymentPeriodError } from './errors.js';

export type ContractType = 'full_time' | 'part_time' | 'contractor' | 'temporary' | 'intern';

export interface EmploymentPeriodProps {
  readonly id: EmploymentPeriodId;
  readonly personId: PersonId;
  readonly contractType: ContractType;
  readonly validFrom: Date;
  readonly validUntil?: Date | null;
  readonly jobTitle?: string | null;
  readonly department?: string | null;
  readonly createdAt?: Date;
}

export class EmploymentPeriod {
  private constructor(public readonly props: EmploymentPeriodProps) {}

  public static create(props: EmploymentPeriodProps): Result<EmploymentPeriod, DomainError> {
    if (!props.id) {
      return err(new InvalidEmploymentPeriodError('Employment period ID is required'));
    }
    if (!props.personId) {
      return err(new InvalidEmploymentPeriodError('Person ID is required'));
    }
    if (!props.validFrom || isNaN(props.validFrom.getTime())) {
      return err(new InvalidEmploymentPeriodError('Valid from date is invalid'));
    }
    if (props.validUntil && isNaN(props.validUntil.getTime())) {
      return err(new InvalidEmploymentPeriodError('Valid until date is invalid'));
    }
    if (props.validUntil && props.validUntil < props.validFrom) {
      return err(new InvalidEmploymentPeriodError('Valid until date cannot be before valid from date'));
    }

    return ok(new EmploymentPeriod({
      id: props.id,
      personId: props.personId,
      contractType: props.contractType || 'full_time',
      validFrom: props.validFrom,
      validUntil: props.validUntil ?? null,
      jobTitle: props.jobTitle?.trim() || null,
      department: props.department?.trim() || null,
      createdAt: props.createdAt ?? new Date(),
    }));
  }

  get id(): EmploymentPeriodId { return this.props.id; }
  get personId(): PersonId { return this.props.personId; }
  get contractType(): ContractType { return this.props.contractType; }
  get validFrom(): Date { return this.props.validFrom; }
  get validUntil(): Date | null { return this.props.validUntil ?? null; }
  get jobTitle(): string | null { return this.props.jobTitle ?? null; }
  get department(): string | null { return this.props.department ?? null; }

  public isActiveAt(at: Date): boolean {
    const time = at.getTime();
    if (time < this.validFrom.getTime()) {
      return false;
    }
    if (this.validUntil && time > this.validUntil.getTime()) {
      return false;
    }
    return true;
  }

  public overlapsWith(otherFrom: Date, otherUntil?: Date | null): boolean {
    const aFrom = this.validFrom.getTime();
    const aUntil = this.validUntil ? this.validUntil.getTime() : Infinity;
    const bFrom = otherFrom.getTime();
    const bUntil = otherUntil ? otherUntil.getTime() : Infinity;

    return aFrom <= bUntil && aUntil >= bFrom;
  }
}
