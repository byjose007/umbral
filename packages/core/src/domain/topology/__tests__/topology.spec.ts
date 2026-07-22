import { describe, it, expect } from 'vitest';
import {
  makeSiteId,
  makeZoneId,
  makeDoorId,
  makeControllerId,
  makeReaderId,
  makeLockProfileId,
} from '../ids.js';
import { Site } from '../site.entity.js';
import { Zone } from '../zone.entity.js';
import { Controller } from '../controller.entity.js';
import { Door } from '../door.entity.js';
import { Reader, ReaderProtocol } from '../reader.entity.js';
import { LockProfile, LockActuationMode, FailState } from '../lock-profile.vo.js';
import { SimulatorAdapter } from '../simulator.adapter.js';
import { exportTopologyConfig, importTopologyConfig } from '../config-export.js';
import { firstValueFrom, filter } from 'rxjs';

describe('Topology Domain Foundation', () => {
  describe('Site & Zone Entities', () => {
    it('creates site with unique code and timezone', () => {
      const siteRes = Site.create({
        id: makeSiteId('site-1'),
        code: 'TCH',
        name: 'Torre Central',
        timezone: 'America/Guayaquil',
      });
      expect(siteRes.isOk()).toBe(true);
      if (siteRes.isOk()) {
        expect(siteRes.value.code).toBe('TCH');
        expect(siteRes.value.timezone).toBe('America/Guayaquil');
      }
    });

    it('handles zone hierarchy with parent-child relation', () => {
      const parentZone = Zone.create({
        id: makeZoneId('z-root'),
        siteId: makeSiteId('site-1'),
        code: 'NIVEL-9',
        name: 'Nivel 9',
      });
      expect(parentZone.isOk()).toBe(true);

      const childZone = Zone.create({
        id: makeZoneId('z-child'),
        siteId: makeSiteId('site-1'),
        parentId: makeZoneId('z-root'),
        code: 'SCN-9153',
        name: 'SCN Room 9153',
      });
      expect(childZone.isOk()).toBe(true);
      if (childZone.isOk()) {
        expect(childZone.value.parentId).toBe('z-root');
      }
    });
  });

  describe('LockProfile Invariants (Life-Safety)', () => {
    it('accepts valid pulse profile', () => {
      const lpRes = LockProfile.create({
        id: makeLockProfileId('lp-1'),
        name: 'Puerta estándar',
        actuationMode: LockActuationMode.PULSE,
        pulseDurationMs: 5000,
        failState: FailState.FAIL_SECURE,
        hasDoorPositionSensor: true,
        heldOpenTimeoutSec: 30,
        isEgressRoute: false,
        releasesOnFire: false,
      });
      expect(lpRes.isOk()).toBe(true);
    });

    it('rejects pulse duration out of range (< 100ms)', () => {
      const lpRes = LockProfile.create({
        id: makeLockProfileId('lp-invalid'),
        name: 'Pulse corto',
        actuationMode: LockActuationMode.PULSE,
        pulseDurationMs: 50,
        failState: FailState.FAIL_SECURE,
        hasDoorPositionSensor: true,
        heldOpenTimeoutSec: null,
        isEgressRoute: false,
        releasesOnFire: false,
      });
      expect(lpRes.isErr()).toBe(true);
      if (lpRes.isErr()) {
        expect(lpRes.error.code).toBe('INVALID_PULSE_DURATION');
      }
    });

    it('rejects egress route configured as fail-secure', () => {
      const lpRes = LockProfile.create({
        id: makeLockProfileId('lp-insecure-egress'),
        name: 'Evacuación Insegura',
        actuationMode: LockActuationMode.PULSE,
        pulseDurationMs: 3000,
        failState: FailState.FAIL_SECURE,
        hasDoorPositionSensor: true,
        heldOpenTimeoutSec: 15,
        isEgressRoute: true,
        releasesOnFire: true,
      });
      expect(lpRes.isErr()).toBe(true);
      if (lpRes.isErr()) {
        expect(lpRes.error.code).toBe('LIFE_SAFETY_INVARIANT_VIOLATION');
      }
    });

    it('rejects egress route without fire release', () => {
      const lpRes = LockProfile.create({
        id: makeLockProfileId('lp-nofire-egress'),
        name: 'Evacuación Sin Incendio',
        actuationMode: LockActuationMode.PULSE,
        pulseDurationMs: 3000,
        failState: FailState.FAIL_SAFE,
        hasDoorPositionSensor: true,
        heldOpenTimeoutSec: 15,
        isEgressRoute: true,
        releasesOnFire: false,
      });
      expect(lpRes.isErr()).toBe(true);
      if (lpRes.isErr()) {
        expect(lpRes.error.code).toBe('LIFE_SAFETY_INVARIANT_VIOLATION');
      }
    });

    it('rejects held-open timeout without DPS sensor', () => {
      const lpRes = LockProfile.create({
        id: makeLockProfileId('lp-nodps'),
        name: 'Sin DPS con timeout',
        actuationMode: LockActuationMode.PULSE,
        pulseDurationMs: 3000,
        failState: FailState.FAIL_SECURE,
        hasDoorPositionSensor: false,
        heldOpenTimeoutSec: 15,
        isEgressRoute: false,
        releasesOnFire: false,
      });
      expect(lpRes.isErr()).toBe(true);
      if (lpRes.isErr()) {
        expect(lpRes.error.code).toBe('DPS_REQUIRED_FOR_HELD_OPEN_ALERT');
      }
    });

    it('allows egress route when fail-safe and releases on fire', () => {
      const lpRes = LockProfile.create({
        id: makeLockProfileId('lp-valid-egress'),
        name: 'Evacuación Válida',
        actuationMode: LockActuationMode.MAINTAINED,
        pulseDurationMs: 0,
        failState: FailState.FAIL_SAFE,
        hasDoorPositionSensor: true,
        heldOpenTimeoutSec: 10,
        isEgressRoute: true,
        releasesOnFire: true,
      });
      expect(lpRes.isOk()).toBe(true);
    });
  });

  describe('Door & Reader Rules', () => {
    it('formats hierarchical door name correctly', () => {
      const doorRes = Door.create({
        id: makeDoorId('door-1'),
        siteId: makeSiteId('site-1'),
        controllerId: makeControllerId('ctrl-1'),
        lockProfileId: makeLockProfileId('lp-1'),
        zoneInsideId: makeZoneId('z-child'),
        name: 'SCN Room 9153',
      });
      expect(doorRes.isOk()).toBe(true);
      if (doorRes.isOk()) {
        expect(doorRes.value.getHierarchicalName('TCH', 'Nivel 9')).toBe('TCH · Nivel 9 · SCN Room 9153');
      }
    });

    it('rejects door missing mandatory references', () => {
      const doorRes = Door.create({
        id: makeDoorId('door-invalid'),
        siteId: makeSiteId('site-1'),
        controllerId: '' as any,
        lockProfileId: makeLockProfileId('lp-1'),
        zoneInsideId: makeZoneId('z-1'),
        name: 'Puerta Invalida',
      });
      expect(doorRes.isErr()).toBe(true);
    });

    it('rejects Wiegand reader without risk acceptance', () => {
      const readerRes = Reader.create({
        id: makeReaderId('r-wiegand'),
        doorId: makeDoorId('door-1'),
        name: 'Lector Wiegand Entradas',
        protocol: ReaderProtocol.WIEGAND,
        direction: 'in',
      });
      expect(readerRes.isErr()).toBe(true);
      if (readerRes.isErr()) {
        expect(readerRes.error.code).toBe('WIEGAND_RISK_NOT_ACCEPTED');
      }
    });

    it('accepts Wiegand reader with risk acceptance signed metadata', () => {
      const readerRes = Reader.create({
        id: makeReaderId('r-wiegand-ok'),
        doorId: makeDoorId('door-1'),
        name: 'Lector Wiegand Migracion',
        protocol: ReaderProtocol.WIEGAND,
        direction: 'in',
        riskAcceptedBy: 'admin@company.com',
        riskAcceptedAt: new Date(),
      });
      expect(readerRes.isOk()).toBe(true);
      if (readerRes.isOk()) {
        expect(readerRes.value.isMigrationMode).toBe(true);
      }
    });

    it('accepts OSDP reader standard without risk acceptance', () => {
      const readerRes = Reader.create({
        id: makeReaderId('r-osdp'),
        doorId: makeDoorId('door-1'),
        name: 'Lector OSDP Principal',
        protocol: ReaderProtocol.OSDP,
        direction: 'in',
      });
      expect(readerRes.isOk()).toBe(true);
    });
  });

  describe('SimulatorAdapter Operation', () => {
    it('simulates door opening and emits door.opened event', async () => {
      const adapter = new SimulatorAdapter();
      const doorId = makeDoorId('vdoor-1');
      const ctrlId = makeControllerId('vctrl-1');
      const lp = LockProfile.create({
        id: makeLockProfileId('vlp-1'),
        name: 'Virtual Lock',
        actuationMode: LockActuationMode.PULSE,
        pulseDurationMs: 1000,
        failState: FailState.FAIL_SECURE,
        hasDoorPositionSensor: true,
        heldOpenTimeoutSec: 1,
        isEgressRoute: false,
        releasesOnFire: false,
      })._unsafeUnwrap();

      adapter.registerVirtualDoor(doorId, ctrlId, lp);

      const eventPromise = firstValueFrom(
        adapter.events$.pipe(filter((e) => e.eventType === 'door.opened'))
      );

      await adapter.grantAccess(doorId);

      const event = await eventPromise;
      expect(event.doorId).toBe('vdoor-1');
      expect(event.eventType).toBe('door.opened');
    });

    it('simulates forced open event', async () => {
      const adapter = new SimulatorAdapter();
      const doorId = makeDoorId('vdoor-2');
      const ctrlId = makeControllerId('vctrl-1');
      const lp = LockProfile.create({
        id: makeLockProfileId('vlp-2'),
        name: 'Virtual Lock',
        actuationMode: LockActuationMode.PULSE,
        pulseDurationMs: 1000,
        failState: FailState.FAIL_SECURE,
        hasDoorPositionSensor: true,
        heldOpenTimeoutSec: 1,
        isEgressRoute: false,
        releasesOnFire: false,
      })._unsafeUnwrap();

      adapter.registerVirtualDoor(doorId, ctrlId, lp);

      const eventPromise = firstValueFrom(
        adapter.events$.pipe(filter((e) => e.eventType === 'door.forced_open'))
      );

      adapter.simulateForcedOpen(doorId);

      const event = await eventPromise;
      expect(event.eventType).toBe('door.forced_open');
    });
  });

  describe('Export & Import Topology Configuration', () => {
    it('exports topology and re-imports while preserving invariants', () => {
      const site = Site.create({ id: makeSiteId('s1'), code: 'TCH', name: 'Site 1', timezone: 'UTC' })._unsafeUnwrap();
      const zone = Zone.create({ id: makeZoneId('z1'), siteId: site.id, code: 'Z1', name: 'Zone 1' })._unsafeUnwrap();
      const lp = LockProfile.create({
        id: makeLockProfileId('lp1'),
        name: 'LP 1',
        actuationMode: LockActuationMode.PULSE,
        pulseDurationMs: 3000,
        failState: FailState.FAIL_SAFE,
        hasDoorPositionSensor: true,
        heldOpenTimeoutSec: 10,
        isEgressRoute: true,
        releasesOnFire: true,
      })._unsafeUnwrap();
      const ctrl = Controller.create({ id: makeControllerId('c1'), siteId: site.id, name: 'C1', ipAddress: '192.168.1.10' })._unsafeUnwrap();
      const door = Door.create({ id: makeDoorId('d1'), siteId: site.id, controllerId: ctrl.id, lockProfileId: lp.id, zoneInsideId: zone.id, name: 'D1' })._unsafeUnwrap();
      const reader = Reader.create({ id: makeReaderId('r1'), doorId: door.id, name: 'R1', protocol: ReaderProtocol.OSDP, direction: 'in' })._unsafeUnwrap();

      const exported = exportTopologyConfig({
        sites: [site],
        zones: [zone],
        lockProfiles: [lp],
        controllers: [ctrl],
        doors: [door],
        readers: [reader],
      });

      const importedRes = importTopologyConfig(exported);
      expect(importedRes.isOk()).toBe(true);
      if (importedRes.isOk()) {
        expect(importedRes.value.sites.length).toBe(1);
        expect(importedRes.value.lockProfiles[0]?.isEgressRoute).toBe(true);
      }
    });

    it('rejects import if exported config contains invalid invariants', () => {
      const invalidExport: any = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        sites: [],
        zones: [],
        lockProfiles: [
          {
            id: 'lp-bad',
            name: 'Bad Egress',
            actuationMode: 'pulse',
            pulseDurationMs: 3000,
            failState: 'fail_secure', // INVALID!
            hasDoorPositionSensor: true,
            heldOpenTimeoutSec: 10,
            isEgressRoute: true,
            releasesOnFire: true,
          },
        ],
        controllers: [],
        doors: [],
        readers: [],
      };

      const importRes = importTopologyConfig(invalidExport);
      expect(importRes.isErr()).toBe(true);
    });
  });
});
