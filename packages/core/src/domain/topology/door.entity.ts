import { ok, err, Result } from 'neverthrow';
import { DoorId, SiteId, ControllerId, LockProfileId, ZoneId } from './ids.js';
import { DomainError } from './errors.js';

export interface DoorProps {
  readonly id: DoorId;
  readonly siteId: SiteId;
  readonly controllerId: ControllerId;
  readonly lockProfileId: LockProfileId;
  readonly zoneInsideId: ZoneId;
  readonly zoneOutsideId?: ZoneId | null;
  readonly name: string;
  readonly dpsSupervised?: boolean;
  readonly rexSupervised?: boolean;
}

export class Door {
  private constructor(public readonly props: Required<DoorProps>) {}

  public static create(props: DoorProps): Result<Door, DomainError> {
    if (!props.name || props.name.trim().length === 0) {
      return err(new DomainError('INVALID_DOOR_NAME', 'Door name cannot be empty'));
    }
    if (!props.controllerId) {
      return err(new DomainError('MISSING_CONTROLLER_ID', 'Door requires a valid controllerId'));
    }
    if (!props.lockProfileId) {
      return err(new DomainError('MISSING_LOCK_PROFILE_ID', 'Door requires a valid lockProfileId'));
    }
    if (!props.zoneInsideId) {
      return err(new DomainError('MISSING_ZONE_INSIDE_ID', 'Door requires a valid zoneInsideId'));
    }

    return ok(
      new Door({
        id: props.id,
        siteId: props.siteId,
        controllerId: props.controllerId,
        lockProfileId: props.lockProfileId,
        zoneInsideId: props.zoneInsideId,
        zoneOutsideId: props.zoneOutsideId ?? null,
        name: props.name.trim(),
        dpsSupervised: props.dpsSupervised ?? false,
        rexSupervised: props.rexSupervised ?? false,
      })
    );
  }

  get id(): DoorId { return this.props.id; }
  get siteId(): SiteId { return this.props.siteId; }
  get controllerId(): ControllerId { return this.props.controllerId; }
  get lockProfileId(): LockProfileId { return this.props.lockProfileId; }
  get zoneInsideId(): ZoneId { return this.props.zoneInsideId; }
  get zoneOutsideId(): ZoneId | null { return this.props.zoneOutsideId; }
  get name(): string { return this.props.name; }
  get dpsSupervised(): boolean { return this.props.dpsSupervised; }
  get rexSupervised(): boolean { return this.props.rexSupervised; }

  /**
   * Computes the human-readable composite hierarchical name.
   * Example: "TCH · Nivel 9 · SCN Room 9153"
   */
  public getHierarchicalName(siteCode: string, zoneHierarchyName: string): string {
    return `${siteCode} · ${zoneHierarchyName} · ${this.name}`;
  }
}
