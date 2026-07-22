import { Subject, Observable } from 'rxjs';
import { ok, Result } from 'neverthrow';
import { ControllerId, DoorId, SiteId } from './ids.js';
import { DomainError } from './errors.js';
import { DoorControllerPort, RawDeviceEvent, ControllerHealth } from './door-controller.port.js';
import { LockProfile } from './lock-profile.vo.js';

export interface VirtualDoorState {
  doorId: DoorId;
  controllerId: ControllerId;
  lockProfile: LockProfile;
  isOpen: boolean;
  isUnlocked: boolean;
  heldOpenTimer?: NodeJS.Timeout | number;
}

export class SimulatorAdapter implements DoorControllerPort {
  private readonly eventsSubject = new Subject<RawDeviceEvent>();
  private readonly virtualDoors = new Map<string, VirtualDoorState>();
  private isLockdownActive = false;

  public get events$(): Observable<RawDeviceEvent> {
    return this.eventsSubject.asObservable();
  }

  public registerVirtualDoor(doorId: DoorId, controllerId: ControllerId, lockProfile: LockProfile): void {
    this.virtualDoors.set(doorId, {
      doorId,
      controllerId,
      lockProfile,
      isOpen: false,
      isUnlocked: false,
    });
  }

  public async grantAccess(doorId: DoorId, durationMs?: number): Promise<Result<void, DomainError>> {
    const doorState = this.virtualDoors.get(doorId);
    if (!doorState) {
      return ok(undefined); // gracefully handle unregistered virtual doors in simulation
    }

    if (this.isLockdownActive) {
      return ok(undefined);
    }

    doorState.isUnlocked = true;
    doorState.isOpen = true;

    const eventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.eventsSubject.next({
      id: eventId,
      timestamp: new Date(),
      controllerId: doorState.controllerId,
      doorId: doorState.doorId,
      eventType: 'door.opened',
      details: { mode: 'grant_access', durationMs: durationMs ?? doorState.lockProfile.pulseDurationMs },
    });

    if (doorState.lockProfile.hasDoorPositionSensor && doorState.lockProfile.heldOpenTimeoutSec) {
      if (doorState.heldOpenTimer) {
        clearTimeout(doorState.heldOpenTimer as unknown as number);
      }

      const timeoutMs = (durationMs ?? doorState.lockProfile.pulseDurationMs) + (doorState.lockProfile.heldOpenTimeoutSec * 1000);
      doorState.heldOpenTimer = setTimeout(() => {
        if (doorState.isOpen) {
          this.eventsSubject.next({
            id: `evt-dho-${Date.now()}`,
            timestamp: new Date(),
            controllerId: doorState.controllerId,
            doorId: doorState.doorId,
            eventType: 'door.held_open',
            details: { timeoutSec: doorState.lockProfile.heldOpenTimeoutSec },
          });
        }
      }, timeoutMs) as unknown as NodeJS.Timeout;
    }

    return ok(undefined);
  }

  public closeDoor(doorId: DoorId): void {
    const doorState = this.virtualDoors.get(doorId);
    if (doorState) {
      doorState.isOpen = false;
      doorState.isUnlocked = false;
      if (doorState.heldOpenTimer) {
        clearTimeout(doorState.heldOpenTimer as unknown as number);
        doorState.heldOpenTimer = undefined;
      }
      this.eventsSubject.next({
        id: `evt-close-${Date.now()}`,
        timestamp: new Date(),
        controllerId: doorState.controllerId,
        doorId: doorState.doorId,
        eventType: 'door.closed',
      });
    }
  }

  public simulateForcedOpen(doorId: DoorId): void {
    const doorState = this.virtualDoors.get(doorId);
    if (doorState) {
      doorState.isOpen = true;
      this.eventsSubject.next({
        id: `evt-forced-${Date.now()}`,
        timestamp: new Date(),
        controllerId: doorState.controllerId,
        doorId: doorState.doorId,
        eventType: 'door.forced_open',
        details: { alarm: true },
      });
    }
  }

  public async pushAccessMatrix(controllerId: ControllerId, _matrix: Record<string, unknown>): Promise<Result<void, DomainError>> {
    return ok(undefined);
  }

  public async setLockdown(_siteId: SiteId | null, active: boolean): Promise<Result<void, DomainError>> {
    this.isLockdownActive = active;
    return ok(undefined);
  }

  public async health(controllerId: ControllerId): Promise<ControllerHealth> {
    return {
      controllerId,
      status: 'online',
      lastSeen: new Date(),
      firmwareVersion: '1.0.0-sim',
    };
  }

  public async syncClock(_controllerId: ControllerId): Promise<Result<void, DomainError>> {
    return ok(undefined);
  }
}
