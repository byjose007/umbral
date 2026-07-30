import { ok, err, Result } from 'neverthrow';
import { OperatorId } from './ids.js';
import { SiteId } from '../topology/ids.js';
import { OperatorRole, isOperatorRole } from './roles.js';
import { DomainError, InvalidOperatorError } from './errors.js';

export type OperatorStatus = 'active' | 'disabled';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface OperatorProps {
  readonly id: OperatorId;
  readonly siteId: SiteId;
  readonly fullName: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: OperatorRole;
  readonly status?: OperatorStatus;
  readonly createdAt?: Date;
  readonly lastLoginAt?: Date | null;
}

export class Operator {
  private constructor(public readonly props: OperatorProps) {}

  public static create(props: OperatorProps): Result<Operator, DomainError> {
    if (!props.id) {
      return err(new InvalidOperatorError('Operator ID is required'));
    }
    if (!props.siteId) {
      return err(new InvalidOperatorError('Site ID is required'));
    }
    if (!props.fullName || props.fullName.trim().length === 0) {
      return err(new InvalidOperatorError('Full name cannot be empty'));
    }
    if (!props.email || !EMAIL_PATTERN.test(props.email.trim())) {
      return err(new InvalidOperatorError(`Invalid email: ${props.email}`));
    }
    if (!props.passwordHash) {
      return err(new InvalidOperatorError('Password hash is required'));
    }
    if (!isOperatorRole(props.role)) {
      return err(new InvalidOperatorError(`Invalid operator role: ${props.role}`));
    }

    return ok(new Operator({
      id: props.id,
      siteId: props.siteId,
      fullName: props.fullName.trim(),
      email: props.email.trim().toLowerCase(),
      passwordHash: props.passwordHash,
      role: props.role,
      status: props.status ?? 'active',
      createdAt: props.createdAt ?? new Date(),
      lastLoginAt: props.lastLoginAt ?? null,
    }));
  }

  get id(): OperatorId { return this.props.id; }
  get siteId(): SiteId { return this.props.siteId; }
  get fullName(): string { return this.props.fullName; }
  get email(): string { return this.props.email; }
  get passwordHash(): string { return this.props.passwordHash; }
  get role(): OperatorRole { return this.props.role; }
  get status(): OperatorStatus { return this.props.status ?? 'active'; }
  get canAuthenticate(): boolean { return this.status === 'active'; }

  /** Returns a copy with lastLoginAt refreshed — operators are immutable value objects. */
  public withLoginRecorded(at: Date = new Date()): Operator {
    return new Operator({ ...this.props, lastLoginAt: at });
  }

  /** Public, non-sensitive projection safe to return over the wire. */
  get publicProps() {
    return {
      id: this.props.id,
      siteId: this.props.siteId,
      fullName: this.props.fullName,
      email: this.props.email,
      role: this.props.role,
      status: this.status,
      lastLoginAt: this.props.lastLoginAt ?? null,
    };
  }
}
