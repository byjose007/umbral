import { ok, err, Result } from 'neverthrow';
import { SiteId, OrganizationId } from './ids.js';
import { DomainError } from './errors.js';

export interface SiteProps {
  readonly id: SiteId;
  readonly organizationId: OrganizationId;
  readonly code: string;
  readonly name: string;
  readonly timezone: string;
}

export class Site {
  private constructor(public readonly props: SiteProps) {}

  public static create(props: SiteProps): Result<Site, DomainError> {
    if (!props.organizationId) {
      return err(new DomainError('INVALID_SITE_ORG', 'Organization ID is required'));
    }
    if (!props.code || props.code.trim().length === 0) {
      return err(new DomainError('INVALID_SITE_CODE', 'Site code cannot be empty'));
    }
    if (!props.name || props.name.trim().length === 0) {
      return err(new DomainError('INVALID_SITE_NAME', 'Site name cannot be empty'));
    }
    if (!props.timezone || props.timezone.trim().length === 0) {
      return err(new DomainError('INVALID_SITE_TIMEZONE', 'Site timezone cannot be empty'));
    }

    return ok(new Site({
      id: props.id,
      organizationId: props.organizationId,
      code: props.code.trim().toUpperCase(),
      name: props.name.trim(),
      timezone: props.timezone.trim(),
    }));
  }

  get id(): SiteId { return this.props.id; }
  get organizationId(): OrganizationId { return this.props.organizationId; }
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get timezone(): string { return this.props.timezone; }
}
