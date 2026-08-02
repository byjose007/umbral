import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { DeviceGatewayModule } from './device-gateway.module';
import { DeviceGatewayController } from './device-gateway.controller';
import { DeviceGatewayService } from './device-gateway.service';
import { TopologyService } from '../topology/topology.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('DeviceGatewayModule', () => {
  let controller: DeviceGatewayController;
  let service: DeviceGatewayService;
  let topologyService: TopologyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DeviceGatewayModule],
    }).compile();
    // Intentionally not calling module.init() — these are pure unit tests against the in-memory
    // service/controller and must not require a live MQTT broker connection.

    controller = module.get<DeviceGatewayController>(DeviceGatewayController);
    service = module.get<DeviceGatewayService>(DeviceGatewayService);
    topologyService = module.get<TopologyService>(TopologyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('provisions controller with mTLS certificate thumbprint and denies revoked device', () => {
    const controllerId = 'ctrl-101';
    const thumbprint = 'SHA256:A1B2C3D4E5F67890';

    const prov = controller.provisionDevice({
      controllerId,
      certificateThumbprint: thumbprint,
    });
    expect(prov.status).toBe('active');

    const topics = controller.getMQTTTopics(controllerId);
    expect(topics.eventsTopic).toBe(
      `umbral/v1/controllers/${controllerId}/events`,
    );

    // Revoke certificate
    controller.revokeCertificate({ controllerId });

    expect(() => controller.getMQTTTopics(controllerId)).toThrow(
      ForbiddenException,
    );
  });

  it('deduplicates incoming events by event_id idempotently', () => {
    const controllerId = 'ctrl-202';
    controller.provisionDevice({
      controllerId,
      certificateThumbprint: 'THUMB-202',
    });

    const eventPayload = {
      eventId: 'evt-uuid-1001',
      controllerId,
      doorId: 'door-9',
      eventType: 'access.granted',
      timestamp: new Date().toISOString(),
    };

    const firstResult = controller.ingestEvent(eventPayload);
    expect(firstResult.duplicate).toBe(false);
    expect(firstResult.status).toBe('ingested');

    // Resend same event payload from offline buffer
    const secondResult = controller.ingestEvent(eventPayload);
    expect(secondResult.duplicate).toBe(true);
    expect(secondResult.status).toBe('ignored_duplicate');
  });

  it('detects clock drift > 2000 ms and triggers matrix push when version is behind', () => {
    const controllerId = 'ctrl-303';
    controller.provisionDevice({
      controllerId,
      certificateThumbprint: 'THUMB-303',
    });

    const serverNow = Date.now();
    const deviceTimeWithDrift = serverNow - 3500; // 3.5s drift

    const hbResult = controller.recordHeartbeat(
      {
        controllerId,
        appliedMatrixVersion: 1,
        firmwareVersion: '1.2.0',
        deviceTimestamp: deviceTimeWithDrift,
      },
      '2', // Server matrix is at version 2!
    );

    expect(hbResult.clockDriftExceeded).toBe(true); // > 2000 ms
    expect(hbResult.requiresMatrixPush).toBe(true); // Controller applied v1, server is v2
  });

  it('emits device.offline status when heartbeat timeout is exceeded', () => {
    const controllerId = 'ctrl-404';
    controller.provisionDevice({
      controllerId,
      certificateThumbprint: 'THUMB-404',
    });

    // No heartbeat recorded yet
    const health = controller.getDeviceHealth(controllerId, '1');
    expect(health.isOnline).toBe(false);
    expect(health.status).toBe('device.offline');
  });

  it('lists combined controller status, defaulting unprovisioned controllers instead of throwing', () => {
    // Seed the default organization without triggering the wider module's MQTT lifecycle hook.
    topologyService.onModuleInit();

    const site = topologyService.createSite({
      code: 'SITE-DG',
      name: 'Device Gateway Test Site',
      timezone: 'UTC',
    });

    const neverProvisioned = topologyService.createController({
      siteId: site.id,
      name: 'Never Provisioned Controller',
      ipAddress: '10.0.0.5',
    });

    const provisioned = topologyService.createController({
      siteId: site.id,
      name: 'Healthy Controller',
      ipAddress: '10.0.0.6',
    });
    controller.provisionDevice({
      controllerId: provisioned.id,
      certificateThumbprint: 'THUMB-DG-1',
    });
    controller.recordHeartbeat(
      {
        controllerId: provisioned.id,
        appliedMatrixVersion: 1,
        firmwareVersion: '1.0.0',
        deviceTimestamp: Date.now(),
      },
      '1',
    );

    const list = controller.listControllers(site.id);
    const byId = new Map(list.map((c: any) => [c.id, c]));

    const untouched = byId.get(neverProvisioned.id);
    expect(untouched.certificateStatus).toBe('unprovisioned');
    expect(untouched.isOnline).toBe(false);

    const healthy = byId.get(provisioned.id);
    expect(healthy.certificateStatus).toBe('active');
    expect(healthy.isOnline).toBe(true);
  });
});
