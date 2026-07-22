import { ok, err, Result } from 'neverthrow';
import { ControllerId, SiteId } from './ids.js';
import { DomainError } from './errors.js';

export interface ControllerProps {
  readonly id: ControllerId;
  readonly siteId: SiteId;
  readonly name: string;
  readonly ipAddress: string;
  readonly model?: string;
  readonly serialNumber?: string;
  readonly status?: 'online' | 'offline' | 'degraded';
}

export class Controller {
  private constructor(public readonly props: Required<ControllerProps>) {}

  public static create(props: ControllerProps): Result<Controller, DomainError> {
    if (!props.name || props.name.trim().length === 0) {
      return err(new DomainError('INVALID_CONTROLLER_NAME', 'Controller name cannot be empty'));
    }

    return ok(
      new Controller({
        id: props.id,
        siteId: props.siteId,
        name: props.name.trim(),
        ipAddress: props.ipAddress.trim(),
        model: props.model?.trim() ?? 'Simulator',
        serialNumber: props.serialNumber?.trim() ?? 'SIM-001',
        status: props.status ?? 'online',
      })
    );
  }

  get id(): ControllerId { return this.props.id; }
  get siteId(): SiteId { return this.props.siteId; }
  get name(): string { return this.props.name; }
  get ipAddress(): string { return this.props.ipAddress; }
  get model(): string { return this.props.model; }
  get serialNumber(): string { return this.props.serialNumber; }
  get status(): 'online' | 'offline' | 'degraded' { return this.props.status; }
}
