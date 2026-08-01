import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import { ok, Result } from 'neverthrow';
import {
  DoorControllerPort,
  RawDeviceEvent,
  RawDeviceEventType,
  ControllerHealth,
  ControllerId,
  DoorId,
  SiteId,
  DomainError,
  makeControllerId,
  makeDoorId,
  eventsTopic,
  heartbeatTopic,
  matrixTopic,
  commandsTopic,
} from '@umbral/core';
import { MqttClientService } from './mqtt-client.service';
import { DeviceGatewayService } from './device-gateway.service';
import { TopologyService } from '../topology/topology.service';

/** Raw JSON shape a physical controller publishes on its events topic. */
interface RawEventMessage {
  eventId: string;
  controllerId: string;
  doorId: string;
  eventType: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

interface RawHeartbeatMessage {
  controllerId: string;
  appliedMatrixVersion: number;
  firmwareVersion: string;
  batteryStatus?: 'ok' | 'low' | 'critical';
  tamperState?: boolean;
  deviceTimestamp: number;
}

/**
 * Real implementation of DoorControllerPort over MQTT, talking to whatever is connected to the
 * EMQX broker (docker-compose's `emqx` service). Ingestion (events/heartbeats) and commands
 * (grantAccess/setLockdown/pushAccessMatrix/syncClock) both flow through here — the REST endpoints
 * on DeviceGatewayController remain for testing/simulation but this is the real device path.
 */
@Injectable()
export class MqttDoorControllerAdapter implements DoorControllerPort, OnModuleInit {
  private readonly logger = new Logger(MqttDoorControllerAdapter.name);
  private readonly eventsSubject = new Subject<RawDeviceEvent>();
  public readonly events$ = this.eventsSubject.asObservable();

  constructor(
    private readonly mqttClient: MqttClientService,
    private readonly deviceGatewayService: DeviceGatewayService,
    private readonly topologyService: TopologyService,
  ) {}

  onModuleInit(): void {
    this.mqttClient.subscribe(eventsTopic('+'), (topic, payload) => this.handleEventMessage(payload));
    this.mqttClient.subscribe(heartbeatTopic('+'), (topic, payload) => this.handleHeartbeatMessage(payload));
  }

  private handleEventMessage(payload: Buffer): void {
    let raw: RawEventMessage;
    try {
      raw = JSON.parse(payload.toString());
    } catch {
      this.logger.warn('Discarding malformed event payload (invalid JSON)');
      return;
    }

    const result = this.deviceGatewayService.ingestEvent({
      eventId: raw.eventId,
      controllerId: raw.controllerId,
      doorId: raw.doorId,
      eventType: raw.eventType,
      timestamp: raw.timestamp,
      details: raw.details,
    });

    if (result.duplicate) {
      this.logger.debug(`Ignored duplicate event ${raw.eventId}`);
      return;
    }

    this.eventsSubject.next({
      id: raw.eventId,
      timestamp: new Date(raw.timestamp),
      controllerId: makeControllerId(raw.controllerId),
      doorId: makeDoorId(raw.doorId),
      eventType: raw.eventType as RawDeviceEventType,
      details: raw.details,
    });
  }

  private handleHeartbeatMessage(payload: Buffer): void {
    let raw: RawHeartbeatMessage;
    try {
      raw = JSON.parse(payload.toString());
    } catch {
      this.logger.warn('Discarding malformed heartbeat payload (invalid JSON)');
      return;
    }

    const result = this.deviceGatewayService.recordHeartbeat({
      controllerId: raw.controllerId,
      appliedMatrixVersion: raw.appliedMatrixVersion,
      firmwareVersion: raw.firmwareVersion,
      batteryStatus: raw.batteryStatus,
      tamperState: raw.tamperState,
      deviceTimestamp: raw.deviceTimestamp,
    });

    if (result.requiresMatrixPush) {
      const cached = this.deviceGatewayService.getControllerMatrix(raw.controllerId);
      if (cached) {
        this.logger.log(`Controller ${raw.controllerId} reported stale matrix — republishing v${cached.version}`);
        this.mqttClient.publish(matrixTopic(raw.controllerId), cached.matrix);
      }
    }
  }

  async pushAccessMatrix(controllerId: ControllerId, matrix: Record<string, unknown>): Promise<Result<void, DomainError>> {
    this.deviceGatewayService.setControllerMatrix(controllerId, matrix);
    this.mqttClient.publish(matrixTopic(controllerId), matrix);
    return ok(undefined);
  }

  async grantAccess(doorId: DoorId, durationMs?: number): Promise<Result<void, DomainError>> {
    const door = this.topologyService.getDoorById(doorId);
    this.mqttClient.publish(commandsTopic(door.controllerId), {
      command: 'grant_access',
      doorId,
      durationMs: durationMs ?? 5000,
      issuedAt: new Date().toISOString(),
    });
    return ok(undefined);
  }

  async setLockdown(siteId: SiteId | null, active: boolean): Promise<Result<void, DomainError>> {
    const controllers = this.topologyService
      .getControllers()
      .filter((c) => !siteId || c.siteId === siteId);

    for (const controller of controllers) {
      this.mqttClient.publish(commandsTopic(controller.id), {
        command: 'set_lockdown',
        active,
        issuedAt: new Date().toISOString(),
      });
    }
    return ok(undefined);
  }

  async health(controllerId: ControllerId): Promise<ControllerHealth> {
    const status = this.deviceGatewayService.getDeviceHealth(controllerId);
    return {
      controllerId,
      status: status.isOnline ? 'online' : 'offline',
      lastSeen: status.lastSeenAt ?? new Date(0),
      firmwareVersion: status.firmwareVersion ?? 'unknown',
    };
  }

  async syncClock(controllerId: ControllerId): Promise<Result<void, DomainError>> {
    this.mqttClient.publish(commandsTopic(controllerId), {
      command: 'sync_clock',
      serverTime: Date.now(),
    });
    return ok(undefined);
  }
}
