import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TopologyModule } from './topology.module';
import { TopologyService } from './topology.service';
import { TopologyController } from './topology.controller';
import { firstValueFrom, filter } from 'rxjs';

describe('Topology Module (NestJS API)', () => {
  let service: TopologyService;
  let controller: TopologyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TopologyModule],
    }).compile();
    await module.init(); // triggers OnModuleInit (seeds the default organization)

    service = module.get<TopologyService>(TopologyService);
    controller = module.get<TopologyController>(TopologyController);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });

  describe('Full Topology Setup Flow', () => {
    it('creates site, zone, lock profile, controller, door, and reader', () => {
      const site = controller.createSite({
        code: 'TCH',
        name: 'Torre Central',
        timezone: 'America/Guayaquil',
      });
      expect(site.code).toBe('TCH');

      const zone = controller.createZone({
        siteId: site.id,
        code: 'NIVEL-9',
        name: 'Nivel 9',
      });
      expect(zone.name).toBe('Nivel 9');

      const lockProfile = controller.createLockProfile({
        name: 'Puerta Principal Evacuacion',
        actuationMode: 'pulse',
        pulseDurationMs: 3000,
        failState: 'fail_safe',
        relayInverted: false,
        hasDoorPositionSensor: true,
        heldOpenTimeoutSec: 15,
        isEgressRoute: true,
        releasesOnFire: true,
      });
      expect(lockProfile.isEgressRoute).toBe(true);

      const controllerObj = controller.createController({
        siteId: site.id,
        name: 'Controlador iSTAR-01',
        ipAddress: '192.168.1.100',
        model: 'Simulator',
        serialNumber: 'SIM-999',
      });
      expect(controllerObj.name).toBe('Controlador iSTAR-01');

      const doorRes = controller.createDoor({
        siteId: site.id,
        controllerId: controllerObj.id,
        lockProfileId: lockProfile.id,
        zoneInsideId: zone.id,
        name: 'SCN Room 9153',
      });
      expect(doorRes.hierarchicalName).toBe('TCH · Nivel 9 · SCN Room 9153');

      const reader = controller.createReader({
        doorId: doorRes.door.id,
        name: 'Lector Entrada OSDP',
        protocol: 'osdp',
        direction: 'in',
      });
      expect(reader.protocol).toBe('osdp');
    });

    it('enforces Wiegand signed risk acceptance in NestJS layer', () => {
      const site = controller.createSite({
        code: 'TCH2',
        name: 'Site 2',
        timezone: 'UTC',
      });
      const zone = controller.createZone({
        siteId: site.id,
        code: 'Z1',
        name: 'Zone 1',
      });
      const lp = controller.createLockProfile({
        name: 'LP 1',
        actuationMode: 'pulse',
        pulseDurationMs: 2000,
        failState: 'fail_secure',
        hasDoorPositionSensor: false,
        isEgressRoute: false,
        releasesOnFire: false,
      });
      const ctrl = controller.createController({
        siteId: site.id,
        name: 'C1',
        ipAddress: '10.0.0.1',
      });
      const doorRes = controller.createDoor({
        siteId: site.id,
        controllerId: ctrl.id,
        lockProfileId: lp.id,
        zoneInsideId: zone.id,
        name: 'Puerta Wiegand',
      });

      expect(() =>
        controller.createReader({
          doorId: doorRes.door.id,
          name: 'Lector Wiegand Inseguro',
          protocol: 'wiegand',
          direction: 'in',
        }),
      ).toThrow(BadRequestException);

      const validReader = controller.createReader({
        doorId: doorRes.door.id,
        name: 'Lector Wiegand Auditado',
        protocol: 'wiegand',
        direction: 'in',
        riskAcceptedBy: 'security.director@umbral.com',
      });
      expect(validReader.riskAcceptedBy).toBe('security.director@umbral.com');
    });
  });

  describe('Life-Safety Dual Approval Workflow', () => {
    it('requires second distinct approver for changing failState', () => {
      const lp = controller.createLockProfile({
        name: 'Perfil Evacuacion Original',
        actuationMode: 'pulse',
        pulseDurationMs: 3000,
        failState: 'fail_safe',
        hasDoorPositionSensor: true,
        heldOpenTimeoutSec: 10,
        isEgressRoute: true,
        releasesOnFire: true,
      });

      const proposal = controller.proposeLockProfileChange({
        lockProfileId: lp.id,
        author: 'admin-alice@umbral.com',
        reason: 'Ajuste de perfil',
        proposedChanges: {
          failState: 'fail_safe',
        },
      });

      expect(proposal.requiresDualApproval).toBe(true);
      expect(proposal.status).toBe('pending_approval');

      expect(() =>
        controller.approveLockProfileChange({
          versionId: proposal.id,
          approver: 'admin-alice@umbral.com',
        }),
      ).toThrow(ForbiddenException);

      const approved = controller.approveLockProfileChange({
        versionId: proposal.id,
        approver: 'safety-officer-bob@umbral.com',
      });

      expect(approved.status).toBe('applied');
      expect(approved.approvedBy).toBe('safety-officer-bob@umbral.com');
    });
  });

  describe('Simulator Controller Operation', () => {
    it('executes virtual door unlock and emits raw device events', async () => {
      const site = controller.createSite({
        code: 'SIM',
        name: 'Sim Site',
        timezone: 'UTC',
      });
      const zone = controller.createZone({
        siteId: site.id,
        code: 'SZ',
        name: 'Sim Zone',
      });
      const lp = controller.createLockProfile({
        name: 'Sim LP',
        actuationMode: 'pulse',
        pulseDurationMs: 1000,
        failState: 'fail_secure',
        hasDoorPositionSensor: true,
        heldOpenTimeoutSec: 5,
        isEgressRoute: false,
        releasesOnFire: false,
      });
      const ctrl = controller.createController({
        siteId: site.id,
        name: 'Sim Ctrl',
        ipAddress: '127.0.0.1',
      });
      const doorRes = controller.createDoor({
        siteId: site.id,
        controllerId: ctrl.id,
        lockProfileId: lp.id,
        zoneInsideId: zone.id,
        name: 'Puerta Virtual Sim',
      });

      const eventPromise = firstValueFrom(
        service.simulatorAdapter.events$.pipe(
          filter((e) => e.eventType === 'door.opened'),
        ),
      );

      const result = await controller.grantAccess({
        doorId: doorRes.door.id,
        durationMs: 1000,
      });
      expect(result.success).toBe(true);

      const event = await eventPromise;
      expect(event.doorId).toBe(doorRes.door.id);
      expect(event.eventType).toBe('door.opened');
    });
  });

  describe('Topology JSON Export / Import', () => {
    it('exports topology and re-imports successfully', () => {
      const site = controller.createSite({
        code: 'EXP',
        name: 'Export Site',
        timezone: 'UTC',
      });
      const zone = controller.createZone({
        siteId: site.id,
        code: 'EZ',
        name: 'Export Zone',
      });
      const lp = controller.createLockProfile({
        name: 'Export LP',
        actuationMode: 'pulse',
        pulseDurationMs: 2000,
        failState: 'fail_secure',
        hasDoorPositionSensor: false,
        isEgressRoute: false,
        releasesOnFire: false,
      });
      const ctrl = controller.createController({
        siteId: site.id,
        name: 'Export Ctrl',
        ipAddress: '10.0.0.5',
      });
      controller.createDoor({
        siteId: site.id,
        controllerId: ctrl.id,
        lockProfileId: lp.id,
        zoneInsideId: zone.id,
        name: 'Export Door',
      });

      const jsonExport = controller.exportConfig();
      expect(jsonExport.doors.length).toBe(1);

      const importRes = controller.importConfig(jsonExport);
      expect(importRes.imported).toBe(true);
      expect(importRes.totalDoors).toBe(1);
    });
  });
});
