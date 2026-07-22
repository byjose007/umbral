import { ok, err, Result } from 'neverthrow';
import { PersonId } from './ids.js';
import { SiteId } from '../topology/ids.js';
import { DomainError, InvalidPersonError } from './errors.js';

export type PersonType = 'employee' | 'contractor' | 'visitor';

export interface PersonProps {
  readonly id: PersonId;
  readonly siteId: SiteId;
  readonly personType: PersonType;
  readonly firstName: string;
  readonly lastName: string;
  readonly nationalId: string;
  readonly externalRef?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export class Person {
  private constructor(public readonly props: PersonProps) {}

  public static create(props: PersonProps): Result<Person, DomainError> {
    if (!props.id) {
      return err(new InvalidPersonError('Person ID is required'));
    }
    if (!props.siteId) {
      return err(new InvalidPersonError('Site ID is required'));
    }
    if (!['employee', 'contractor', 'visitor'].includes(props.personType)) {
      return err(new InvalidPersonError(`Invalid person type: ${props.personType}`));
    }
    if (!props.firstName || props.firstName.trim().length === 0) {
      return err(new InvalidPersonError('First name cannot be empty'));
    }
    if (!props.lastName || props.lastName.trim().length === 0) {
      return err(new InvalidPersonError('Last name cannot be empty'));
    }
    if (!props.nationalId || props.nationalId.trim().length === 0) {
      return err(new InvalidPersonError('National ID cannot be empty'));
    }

    return ok(new Person({
      id: props.id,
      siteId: props.siteId,
      personType: props.personType,
      firstName: props.firstName.trim(),
      lastName: props.lastName.trim(),
      nationalId: props.nationalId.trim(),
      externalRef: props.externalRef?.trim() || null,
      email: props.email?.trim() || null,
      phone: props.phone?.trim() || null,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    }));
  }

  get id(): PersonId { return this.props.id; }
  get siteId(): SiteId { return this.props.siteId; }
  get personType(): PersonType { return this.props.personType; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }
  get nationalId(): string { return this.props.nationalId; }
  get externalRef(): string | null { return this.props.externalRef ?? null; }
  get email(): string | null { return this.props.email ?? null; }
  get phone(): string | null { return this.props.phone ?? null; }
}
