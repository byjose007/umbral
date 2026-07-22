import { ok, err, Result } from 'neverthrow';
import { GroupId } from './ids.js';
import { PersonId } from '../identity/ids.js';
import { DomainError, AccessRightsError } from './errors.js';

export interface PersonGroupAssignmentProps {
  readonly personId: PersonId;
  readonly groupId: GroupId;
  readonly validFrom: Date;
  readonly validUntil?: Date | null;
  readonly createdAt?: Date;
}

export class PersonGroupAssignment {
  private constructor(public readonly props: PersonGroupAssignmentProps) {}

  public static create(props: PersonGroupAssignmentProps): Result<PersonGroupAssignment, DomainError> {
    if (!props.personId) {
      return err(new AccessRightsError('Person ID is required'));
    }
    if (!props.groupId) {
      return err(new AccessRightsError('Group ID is required'));
    }
    if (props.validUntil && props.validUntil < props.validFrom) {
      return err(new AccessRightsError('Valid until date cannot be before valid from date'));
    }

    return ok(new PersonGroupAssignment({
      personId: props.personId,
      groupId: props.groupId,
      validFrom: props.validFrom,
      validUntil: props.validUntil ?? null,
      createdAt: props.createdAt ?? new Date(),
    }));
  }

  get personId(): PersonId { return this.props.personId; }
  get groupId(): GroupId { return this.props.groupId; }
  get validFrom(): Date { return this.props.validFrom; }
  get validUntil(): Date | null { return this.props.validUntil ?? null; }

  public isActiveAt(at: Date = new Date()): boolean {
    const time = at.getTime();
    if (time < this.validFrom.getTime()) {
      return false;
    }
    if (this.props.validUntil && time > this.props.validUntil.getTime()) {
      return false;
    }
    return true;
  }
}
