import { ok, err, Result } from 'neverthrow';
import { DomainError } from './errors.js';
import { LockProfile, LockProfileProps } from './lock-profile.vo.js';
import { Site, SiteProps } from './site.entity.js';
import { Zone, ZoneProps } from './zone.entity.js';
import { Controller, ControllerProps } from './controller.entity.js';
import { Door, DoorProps } from './door.entity.js';
import { Reader, ReaderProps } from './reader.entity.js';
import { makeControllerId, makeDoorId, makeLockProfileId, makeReaderId, makeSiteId, makeZoneId } from './ids.js';

export interface TopologyExportSchema {
  version: string;
  exportedAt: string;
  sites: SiteProps[];
  zones: ZoneProps[];
  lockProfiles: LockProfileProps[];
  controllers: ControllerProps[];
  doors: DoorProps[];
  readers: ReaderProps[];
}

export interface ValidatedTopologyConfig {
  sites: Site[];
  zones: Zone[];
  lockProfiles: LockProfile[];
  controllers: Controller[];
  doors: Door[];
  readers: Reader[];
}

export function exportTopologyConfig(config: ValidatedTopologyConfig): TopologyExportSchema {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    sites: config.sites.map((s) => s.props),
    zones: config.zones.map((z) => z.props),
    lockProfiles: config.lockProfiles.map((lp) => lp.props),
    controllers: config.controllers.map((c) => c.props),
    doors: config.doors.map((d) => d.props),
    readers: config.readers.map((r) => r.props),
  };
}

export function importTopologyConfig(data: TopologyExportSchema): Result<ValidatedTopologyConfig, DomainError> {
  if (!data || data.version !== '1.0') {
    return err(new DomainError('INVALID_EXPORT_VERSION', 'Unsupported topology export schema version'));
  }

  const sites: Site[] = [];
  for (const s of data.sites || []) {
    const res = Site.create({ ...s, id: makeSiteId(s.id) });
    if (res.isErr()) return err(res.error);
    sites.push(res.value);
  }

  const lockProfiles: LockProfile[] = [];
  for (const lp of data.lockProfiles || []) {
    const res = LockProfile.create({ ...lp, id: makeLockProfileId(lp.id) });
    if (res.isErr()) return err(res.error);
    lockProfiles.push(res.value);
  }

  const zones: Zone[] = [];
  for (const z of data.zones || []) {
    const res = Zone.create({ ...z, id: makeZoneId(z.id), siteId: makeSiteId(z.siteId), parentId: z.parentId ? makeZoneId(z.parentId) : null });
    if (res.isErr()) return err(res.error);
    zones.push(res.value);
  }

  const controllers: Controller[] = [];
  for (const c of data.controllers || []) {
    const res = Controller.create({ ...c, id: makeControllerId(c.id), siteId: makeSiteId(c.siteId) });
    if (res.isErr()) return err(res.error);
    controllers.push(res.value);
  }

  const doors: Door[] = [];
  for (const d of data.doors || []) {
    const res = Door.create({
      ...d,
      id: makeDoorId(d.id),
      siteId: makeSiteId(d.siteId),
      controllerId: makeControllerId(d.controllerId),
      lockProfileId: makeLockProfileId(d.lockProfileId),
      zoneInsideId: makeZoneId(d.zoneInsideId),
      zoneOutsideId: d.zoneOutsideId ? makeZoneId(d.zoneOutsideId) : null,
    });
    if (res.isErr()) return err(res.error);
    doors.push(res.value);
  }

  const readers: Reader[] = [];
  for (const r of data.readers || []) {
    const res = Reader.create({
      ...r,
      id: makeReaderId(r.id),
      doorId: makeDoorId(r.doorId),
      riskAcceptedAt: r.riskAcceptedAt ? new Date(r.riskAcceptedAt) : null,
    });
    if (res.isErr()) return err(res.error);
    readers.push(res.value);
  }

  return ok({
    sites,
    zones,
    lockProfiles,
    controllers,
    doors,
    readers,
  });
}
