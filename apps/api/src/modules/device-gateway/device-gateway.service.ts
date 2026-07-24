import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  makeControllerId,
  eventsTopic,
  matrixTopic,
  heartbeatTopic,
  commandsTopic,
} from '@umbral/core';
import {
  ProvisionDeviceDto,
  RevokeCertificateDto,
  IngestEventDto,
  HeartbeatDto,
} from './dto/device-gateway.dto';
import { v4 as uuidv4 } from './uuid';

export interface DeviceProvisioningInternal {
  id: string;
  controllerId: string;
  certificateThumbprint: string;
  status: 'active' | 'revoked';
  provisionedAt: Date;
  revokedAt?: Date | null;
}

export interface DeviceHealthInternal {
  controllerId: string;
  appliedMatrixVersion: number;
  firmwareVersion: string;
  batteryStatus: 'ok' | 'low' | 'critical';
  tamperState: boolean;
  clockDriftMs: number;
  lastHeartbeatAt: Date;
}

@Injectable()
export class DeviceGatewayService {
  private readonly provisioningMap = new Map<string, DeviceProvisioningInternal>();
  private readonly dedupEventSet = new Set<string>();
  private readonly healthLogsMap = new Map<string, DeviceHealthInternal>();

  // Provisioning & Certificate Management
  public provisionDevice(dto: ProvisionDeviceDto) {
    const existing = this.provisioningMap.get(dto.controllerId);
    if (existing && existing.status === 'active') {
      throw new BadRequestException(`Controller ${dto.controllerId} is already provisioned`);
    }

    const record: DeviceProvisioningInternal = {
      id: uuidv4(),
      controllerId: dto.controllerId,
      certificateThumbprint: dto.certificateThumbprint,
      status: 'active',
      provisionedAt: new Date(),
    };

    this.provisioningMap.set(dto.controllerId, record);
    return record;
  }

  public revokeCertificate(dto: RevokeCertificateDto) {
    const record = this.provisioningMap.get(dto.controllerId);
    if (!record) {
      throw new NotFoundException(`Controller ${dto.controllerId} not provisioned`);
    }

    record.status = 'revoked';
    record.revokedAt = new Date();
    this.provisioningMap.set(dto.controllerId, record);
    return record;
  }

  public getMQTTTopics(controllerId: string) {
    const record = this.provisioningMap.get(controllerId);
    if (!record || record.status === 'revoked') {
      throw new ForbiddenException(`Access denied: Controller ${controllerId} certificate is missing or revoked`);
    }

    return {
      eventsTopic: eventsTopic(controllerId),
      matrixTopic: matrixTopic(controllerId),
      heartbeatTopic: heartbeatTopic(controllerId),
      commandsTopic: commandsTopic(controllerId),
    };
  }

  // Idempotent Event Ingestion
  public ingestEvent(dto: IngestEventDto) {
    const record = this.provisioningMap.get(dto.controllerId);
    if (!record || record.status === 'revoked') {
      throw new ForbiddenException(`Event rejected: Controller ${dto.controllerId} certificate missing or revoked`);
    }

    if (this.dedupEventSet.has(dto.eventId)) {
      return {
        eventId: dto.eventId,
        duplicate: true,
        ingestedAt: new Date(),
        status: 'ignored_duplicate',
      };
    }

    this.dedupEventSet.add(dto.eventId);

    return {
      eventId: dto.eventId,
      duplicate: false,
      ingestedAt: new Date(),
      status: 'ingested',
    };
  }

  // Heartbeat & Health Monitoring
  public recordHeartbeat(dto: HeartbeatDto, currentServerMatrixVersion = 1, at: Date = new Date()) {
    const record = this.provisioningMap.get(dto.controllerId);
    if (!record || record.status === 'revoked') {
      throw new ForbiddenException(`Heartbeat rejected: Controller ${dto.controllerId} certificate missing or revoked`);
    }

    const serverTimeMs = at.getTime();
    const clockDriftMs = Math.abs(serverTimeMs - dto.deviceTimestamp);
    const clockDriftExceeded = clockDriftMs > 2000;

    const isMatrixUpToDate = dto.appliedMatrixVersion >= currentServerMatrixVersion;

    const healthRecord: DeviceHealthInternal = {
      controllerId: dto.controllerId,
      appliedMatrixVersion: dto.appliedMatrixVersion,
      firmwareVersion: dto.firmwareVersion,
      batteryStatus: dto.batteryStatus ?? 'ok',
      tamperState: dto.tamperState ?? false,
      clockDriftMs,
      lastHeartbeatAt: at,
    };

    this.healthLogsMap.set(dto.controllerId, healthRecord);

    return {
      controllerId: dto.controllerId,
      isOnline: true,
      lastSeenAt: at,
      clockDriftMs,
      clockDriftExceeded,
      appliedMatrixVersion: dto.appliedMatrixVersion,
      currentServerMatrixVersion,
      isMatrixUpToDate,
      requiresMatrixPush: !isMatrixUpToDate,
    };
  }

  public getDeviceHealth(controllerId: string, currentServerMatrixVersion = 1, at: Date = new Date(), offlineThresholdMs = 30000) {
    const record = this.provisioningMap.get(controllerId);
    if (!record) {
      throw new NotFoundException(`Controller ${controllerId} not found`);
    }

    const health = this.healthLogsMap.get(controllerId);
    if (!health) {
      return {
        controllerId,
        isOnline: false,
        status: 'device.offline',
        lastSeenAt: null,
        clockDriftMs: 0,
        clockDriftExceeded: false,
        appliedMatrixVersion: 0,
        isMatrixUpToDate: false,
        requiresMatrixPush: true,
      };
    }

    const timeSinceLastHeartbeat = at.getTime() - health.lastHeartbeatAt.getTime();
    const isOnline = timeSinceLastHeartbeat <= offlineThresholdMs;

    return {
      controllerId,
      isOnline,
      status: isOnline ? 'device.online' : 'device.offline',
      lastSeenAt: health.lastHeartbeatAt,
      clockDriftMs: health.clockDriftMs,
      clockDriftExceeded: health.clockDriftMs > 2000,
      appliedMatrixVersion: health.appliedMatrixVersion,
      isMatrixUpToDate: health.appliedMatrixVersion >= currentServerMatrixVersion,
      requiresMatrixPush: health.appliedMatrixVersion < currentServerMatrixVersion,
    };
  }
}
