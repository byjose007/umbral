import { ok, err, Result } from 'neverthrow';
import { OrganizationId } from './ids.js';
import { DomainError } from './errors.js';

export interface OrganizationProps {
  readonly id: OrganizationId;
  readonly code: string;
  readonly name: string;
  /** HMAC secret used to sign/verify this organization's dynamic QR credentials. Server-generated, never client-supplied. */
  readonly seedSecret: string;
  readonly createdAt?: Date;
}

export class Organization {
  private constructor(public readonly props: Required<OrganizationProps>) {}

  public static create(props: OrganizationProps): Result<Organization, DomainError> {
    if (!props.code || props.code.trim().length === 0) {
      return err(new DomainError('INVALID_ORG_CODE', 'Organization code cannot be empty'));
    }
    if (!props.name || props.name.trim().length === 0) {
      return err(new DomainError('INVALID_ORG_NAME', 'Organization name cannot be empty'));
    }
    if (!props.seedSecret || props.seedSecret.trim().length === 0) {
      return err(new DomainError('INVALID_ORG_SEED_SECRET', 'Organization seed secret cannot be empty'));
    }

    return ok(
      new Organization({
        id: props.id,
        code: props.code.trim().toUpperCase(),
        name: props.name.trim(),
        seedSecret: props.seedSecret,
        createdAt: props.createdAt ?? new Date(),
      })
    );
  }

  get id(): OrganizationId { return this.props.id; }
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get seedSecret(): string { return this.props.seedSecret; }
  get createdAt(): Date { return this.props.createdAt; }

  /** Public, non-sensitive projection safe to return over the wire — never leaks seedSecret. */
  get publicProps() {
    return {
      id: this.props.id,
      code: this.props.code,
      name: this.props.name,
      createdAt: this.props.createdAt,
    };
  }
}
