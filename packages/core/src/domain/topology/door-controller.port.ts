import { Observable } from 'rxjs';
import { Result } from 'neverthrow';
import { ControllerId, DoorId, SiteId } from './ids.js';
import { DomainError } from './errors.js';

export type RawDeviceEventType =
  | 'door.opened'
  | 'door.closed'
  | 'door.held_open'
  | 'door.forced_open'
  | 'rex.activated'
  | 'tamper.detected'
  | 'input.fault'
  | 'input.fault_cleared';

export interface RawDeviceEvent {
  readonly id: string;
  readonly timestamp: Date;
  readonly controllerId: ControllerId;
  readonly doorId: DoorId;
  readonly eventType: RawDeviceEventType;
  readonly details?: Record<string, unknown>;
}

export interface ControllerHealth {
  readonly controllerId: ControllerId;
  readonly status: 'online' | 'offline' | 'degraded';
  readonly lastSeen: Date;
  readonly firmwareVersion: string;
}

export interface DoorControllerPort {
  readonly events$: Observable<RawDeviceEvent>;

  pushAccessMatrix(controllerId: ControllerId, matrix: Record<string, unknown>): Promise<Result<void, DomainError>>;
  grantAccess(doorId: DoorId, durationMs?: number): Promise<Result<void, DomainError>>;
  setLockdown(siteId: SiteId | null, active: boolean): Promise<Result<void, DomainError>>;
  health(controllerId: ControllerId): Promise<ControllerHealth>;
  syncClock(controllerId: ControllerId): Promise<Result<void, DomainError>>;
}
