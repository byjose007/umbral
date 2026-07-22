import { ok, err, Result } from 'neverthrow';
import { AccessLevelId, ScheduleId } from './ids.js';
import { SiteId, DoorId } from '../topology/ids.js';
import { DomainError, InvalidAccessLevelError } from './errors.js';

export interface AccessLevelEntry {
  readonly doorId: DoorId;
  readonly scheduleId: ScheduleId;
}

export interface AccessLevelProps {
  readonly id: AccessLevelId;
  readonly siteId: SiteId;
  readonly name: string;
  readonly description?: string | null;
  readonly entries: readonly AccessLevelEntry[];
  readonly createdAt?: Date;
}

export class AccessLevel {
  private constructor(public readonly props: AccessLevelProps) {}

  public static create(props: AccessLevelProps): Result<AccessLevel, DomainError> {
    if (!props.id) {
      return err(new InvalidAccessLevelError('Access level ID is required'));
    }
    if (!props.siteId) {
      return err(new InvalidAccessLevelError('Site ID is required'));
    }
    if (!props.name || props.name.trim().length === 0) {
      return err(new InvalidAccessLevelError('Access level name cannot be empty'));
    }

    for (const e of props.entries) {
      if (!e.doorId || !e.scheduleId) {
        return err(new InvalidAccessLevelError('Access level entry must have both doorId and scheduleId'));
      }
    }

    return ok(new AccessLevel({
      id: props.id,
      siteId: props.siteId,
      name: props.name.trim(),
      description: props.description?.trim() || null,
      entries: Object.freeze([...props.entries]),
      createdAt: props.createdAt ?? new Date(),
    }));
  }

  get id(): AccessLevelId { return this.props.id; }
  get siteId(): SiteId { return this.props.siteId; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description ?? null; }
  get entries(): readonly AccessLevelEntry[] { return this.props.entries; }

  public getScheduleForDoor(doorId: DoorId): ScheduleId | null {
    const entry = this.props.entries.find((e) => e.doorId === doorId);
    return entry ? entry.scheduleId : null;
  }
}
