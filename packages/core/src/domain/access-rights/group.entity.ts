import { ok, err, Result } from 'neverthrow';
import { GroupId, AccessLevelId } from './ids.js';
import { SiteId } from '../topology/ids.js';
import { DomainError, AccessRightsError } from './errors.js';

export interface GroupProps {
  readonly id: GroupId;
  readonly siteId: SiteId;
  readonly name: string;
  readonly description?: string | null;
  readonly accessLevelIds: readonly AccessLevelId[];
  readonly createdAt?: Date;
}

export class Group {
  private constructor(public readonly props: GroupProps) {}

  public static create(props: GroupProps): Result<Group, DomainError> {
    if (!props.id) {
      return err(new AccessRightsError('Group ID is required'));
    }
    if (!props.siteId) {
      return err(new AccessRightsError('Site ID is required'));
    }
    if (!props.name || props.name.trim().length === 0) {
      return err(new AccessRightsError('Group name cannot be empty'));
    }

    return ok(new Group({
      id: props.id,
      siteId: props.siteId,
      name: props.name.trim(),
      description: props.description?.trim() || null,
      accessLevelIds: Object.freeze([...props.accessLevelIds]),
      createdAt: props.createdAt ?? new Date(),
    }));
  }

  get id(): GroupId { return this.props.id; }
  get siteId(): SiteId { return this.props.siteId; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description ?? null; }
  get accessLevelIds(): readonly AccessLevelId[] { return this.props.accessLevelIds; }
}
