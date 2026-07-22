import { ok, err, Result } from 'neverthrow';
import { SiteId, ZoneId } from './ids.js';
import { DomainError } from './errors.js';

export interface ZoneProps {
  readonly id: ZoneId;
  readonly siteId: SiteId;
  readonly parentId?: ZoneId | null;
  readonly code: string;
  readonly name: string;
}

export class Zone {
  private constructor(public readonly props: Required<ZoneProps>) {}

  public static create(props: ZoneProps): Result<Zone, DomainError> {
    if (!props.code || props.code.trim().length === 0) {
      return err(new DomainError('INVALID_ZONE_CODE', 'Zone code cannot be empty'));
    }
    if (!props.name || props.name.trim().length === 0) {
      return err(new DomainError('INVALID_ZONE_NAME', 'Zone name cannot be empty'));
    }

    return ok(
      new Zone({
        id: props.id,
        siteId: props.siteId,
        parentId: props.parentId ?? null,
        code: props.code.trim().toUpperCase(),
        name: props.name.trim(),
      })
    );
  }

  get id(): ZoneId { return this.props.id; }
  get siteId(): SiteId { return this.props.siteId; }
  get parentId(): ZoneId | null { return this.props.parentId; }
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
}
