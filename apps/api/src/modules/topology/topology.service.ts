import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  Organization,
  Site,
  Zone,
  LockProfile,
  Controller,
  Door,
  Reader,
  SimulatorAdapter,
  exportTopologyConfig,
  importTopologyConfig,
  makeOrganizationId,
  makeSiteId,
  makeZoneId,
  makeLockProfileId,
  makeControllerId,
  makeDoorId,
  makeReaderId,
  randomHexBytes,
  LockActuationMode,
  FailState,
  ReaderProtocol,
  ValidatedTopologyConfig,
} from '@umbral/core';
import {
  CreateOrganizationDto,
  CreateSiteDto,
  CreateZoneDto,
  CreateLockProfileDto,
  CreateControllerDto,
  CreateDoorDto,
  CreateReaderDto,
  ProposeLifeSafetyChangeDto,
  ApproveLifeSafetyChangeDto,
} from './dto/topology.dto';
import { cryptoNativeOrRandomUUID } from './uuid';

/**
 * Every org-scoped resource defaults into this organization when the caller doesn't specify one.
 * Its seedSecret matches the legacy hardcoded literal so existing demo flows (apps/user, which has
 * no real login and can't supply an orgId) keep working unchanged.
 */
const DEFAULT_ORGANIZATION_ID = 'org-default';
const DEFAULT_ORGANIZATION_SEED_SECRET = 'secret-key-12345678901234567890';

export interface ConfigVersionRecord {
  id: string;
  versionNumber: number;
  entityType: string;
  entityId: string;
  changedBy: string;
  approvedBy: string | null;
  reason: string;
  requiresDualApproval: boolean;
  status: 'pending_approval' | 'approved' | 'applied' | 'rejected';
  payload: Record<string, unknown>;
  createdAt: Date;
}

@Injectable()
export class TopologyService implements OnModuleInit {
  private readonly organizationsMap = new Map<string, Organization>();
  private readonly sitesMap = new Map<string, Site>();
  private readonly zonesMap = new Map<string, Zone>();
  private readonly lockProfilesMap = new Map<string, LockProfile>();
  private readonly controllersMap = new Map<string, Controller>();
  private readonly doorsMap = new Map<string, Door>();
  private readonly readersMap = new Map<string, Reader>();
  private readonly configVersions: ConfigVersionRecord[] = [];

  public readonly simulatorAdapter = new SimulatorAdapter();

  onModuleInit() {
    if (this.organizationsMap.size > 0) return;

    const orgRes = Organization.create({
      id: makeOrganizationId(DEFAULT_ORGANIZATION_ID),
      code: 'DEFAULT',
      name: 'Organización por Defecto',
      seedSecret: DEFAULT_ORGANIZATION_SEED_SECRET,
    });
    if (orgRes.isOk()) {
      this.organizationsMap.set(orgRes.value.id, orgRes.value);
    }
  }

  // Organizations
  public createOrganization(dto: CreateOrganizationDto): Organization {
    const id = makeOrganizationId(`org-${cryptoNativeOrRandomUUID()}`);
    const orgRes = Organization.create({
      id,
      code: dto.code,
      name: dto.name,
      seedSecret: randomHexBytes(32),
    });

    if (orgRes.isErr()) {
      throw new BadRequestException(orgRes.error.message);
    }

    this.organizationsMap.set(orgRes.value.id, orgRes.value);
    return orgRes.value;
  }

  /** Public list — never exposes seedSecret. */
  public getOrganizations() {
    return Array.from(this.organizationsMap.values()).map((o) => o.publicProps);
  }

  /** Internal use only (e.g. guard-pwa resolving which secret to verify against) — includes seedSecret. */
  public getOrganizationById(id: string): Organization {
    const org = this.organizationsMap.get(id);
    if (!org) throw new NotFoundException(`Organization not found: ${id}`);
    return org;
  }

  // Sites
  public createSite(dto: CreateSiteDto): Site {
    const organizationId = dto.organizationId || DEFAULT_ORGANIZATION_ID;
    if (!this.organizationsMap.has(organizationId)) {
      throw new NotFoundException(`Organization not found: ${organizationId}`);
    }

    const id = makeSiteId(`site-${cryptoNativeOrRandomUUID()}`);
    const siteRes = Site.create({
      id,
      organizationId: makeOrganizationId(organizationId),
      code: dto.code,
      name: dto.name,
      timezone: dto.timezone || 'America/Guayaquil',
    });

    if (siteRes.isErr()) {
      throw new BadRequestException(siteRes.error.message);
    }

    this.sitesMap.set(siteRes.value.id, siteRes.value);
    return siteRes.value;
  }

  public getSites(): Site[] {
    return Array.from(this.sitesMap.values());
  }

  // Zones
  public createZone(dto: CreateZoneDto): Zone {
    const site = this.sitesMap.get(dto.siteId);
    if (!site) {
      throw new NotFoundException(`Site not found with ID: ${dto.siteId}`);
    }

    if (dto.parentId) {
      const parentZone = this.zonesMap.get(dto.parentId);
      if (!parentZone) {
        throw new NotFoundException(
          `Parent zone not found with ID: ${dto.parentId}`,
        );
      }
      if (parentZone.siteId !== dto.siteId) {
        throw new BadRequestException(
          'Parent zone must belong to the same site',
        );
      }
    }

    const id = makeZoneId(`zone-${cryptoNativeOrRandomUUID()}`);
    const zoneRes = Zone.create({
      id,
      siteId: makeSiteId(dto.siteId),
      parentId: dto.parentId ? makeZoneId(dto.parentId) : null,
      code: dto.code,
      name: dto.name,
      apbMode: dto.apbMode,
      apbResetSec: dto.apbResetSec,
    });

    if (zoneRes.isErr()) {
      throw new BadRequestException(zoneRes.error.message);
    }

    this.zonesMap.set(zoneRes.value.id, zoneRes.value);
    return zoneRes.value;
  }

  public getZones(): Zone[] {
    return Array.from(this.zonesMap.values());
  }

  public getZoneById(id: string): Zone {
    const zone = this.zonesMap.get(id);
    if (!zone) throw new NotFoundException(`Zone not found: ${id}`);
    return zone;
  }

  public getDoorById(id: string): Door {
    const door = this.doorsMap.get(id);
    if (!door) throw new NotFoundException(`Door not found: ${id}`);
    return door;
  }

  public getReaderById(id: string): Reader {
    const reader = this.readersMap.get(id);
    if (!reader) throw new NotFoundException(`Reader not found: ${id}`);
    return reader;
  }

  // Lock Profiles
  public createLockProfile(dto: CreateLockProfileDto): LockProfile {
    const id = makeLockProfileId(`lp-${cryptoNativeOrRandomUUID()}`);
    const lpRes = LockProfile.create({
      id,
      name: dto.name,
      actuationMode: dto.actuationMode,
      pulseDurationMs: dto.pulseDurationMs,
      unlockWindowMs: dto.unlockWindowMs,
      failState: dto.failState,
      relayInverted: dto.relayInverted,
      hasDoorPositionSensor: dto.hasDoorPositionSensor,
      hasRexInput: dto.hasRexInput,
      hasTamperInput: dto.hasTamperInput,
      heldOpenTimeoutSec: dto.heldOpenTimeoutSec ?? null,
      heldOpenPrewarnSec: dto.heldOpenPrewarnSec ?? null,
      rexGraceSec: dto.rexGraceSec,
      isEgressRoute: dto.isEgressRoute,
      releasesOnFire: dto.releasesOnFire,
    });

    if (lpRes.isErr()) {
      throw new BadRequestException(lpRes.error.message);
    }

    this.lockProfilesMap.set(lpRes.value.id, lpRes.value);
    return lpRes.value;
  }

  public getLockProfiles(): LockProfile[] {
    return Array.from(this.lockProfilesMap.values());
  }

  // Dual Approval Workflow for Life-Safety Lock Profile Changes
  public proposeLockProfileChange(
    dto: ProposeLifeSafetyChangeDto,
  ): ConfigVersionRecord {
    const existing = this.lockProfilesMap.get(dto.lockProfileId);
    if (!existing) {
      throw new NotFoundException(
        `LockProfile not found: ${dto.lockProfileId}`,
      );
    }

    const isLifeSafetyFieldTouched =
      dto.proposedChanges.failState !== undefined ||
      dto.proposedChanges.isEgressRoute !== undefined ||
      dto.proposedChanges.releasesOnFire !== undefined;

    const versionRecord: ConfigVersionRecord = {
      id: `ver-${cryptoNativeOrRandomUUID()}`,
      versionNumber: this.configVersions.length + 1,
      entityType: 'lock_profile',
      entityId: dto.lockProfileId,
      changedBy: dto.author,
      approvedBy: null,
      reason: dto.reason,
      requiresDualApproval: isLifeSafetyFieldTouched,
      status: isLifeSafetyFieldTouched ? 'pending_approval' : 'applied',
      payload: dto.proposedChanges,
      createdAt: new Date(),
    };

    this.configVersions.push(versionRecord);

    if (!isLifeSafetyFieldTouched) {
      this.applyLockProfileUpdate(dto.lockProfileId, dto.proposedChanges);
    }

    return versionRecord;
  }

  public approveLockProfileChange(
    dto: ApproveLifeSafetyChangeDto,
  ): ConfigVersionRecord {
    const version = this.configVersions.find((v) => v.id === dto.versionId);
    if (!version) {
      throw new NotFoundException(`Version record not found: ${dto.versionId}`);
    }

    if (version.status !== 'pending_approval') {
      throw new BadRequestException(
        `Version record is not pending approval (current status: ${version.status})`,
      );
    }

    if (version.changedBy === dto.approver) {
      throw new ForbiddenException(
        'Life-safety dual approval requires a second distinct approver',
      );
    }

    version.approvedBy = dto.approver;
    version.status = 'applied';

    this.applyLockProfileUpdate(version.entityId, version.payload);

    return version;
  }

  private applyLockProfileUpdate(
    id: string,
    changes: Partial<CreateLockProfileDto>,
  ): LockProfile {
    const existing = this.lockProfilesMap.get(id);
    if (!existing) throw new NotFoundException(`LockProfile not found: ${id}`);

    const updatedRes = LockProfile.create({
      id: existing.id,
      name: changes.name ?? existing.name,
      actuationMode:
        (changes.actuationMode as LockActuationMode) ?? existing.actuationMode,
      pulseDurationMs: changes.pulseDurationMs ?? existing.pulseDurationMs,
      unlockWindowMs: changes.unlockWindowMs ?? existing.unlockWindowMs,
      failState: (changes.failState as FailState) ?? existing.failState,
      relayInverted: changes.relayInverted ?? existing.relayInverted,
      hasDoorPositionSensor:
        changes.hasDoorPositionSensor ?? existing.hasDoorPositionSensor,
      hasRexInput: changes.hasRexInput ?? existing.hasRexInput,
      hasTamperInput: changes.hasTamperInput ?? existing.hasTamperInput,
      heldOpenTimeoutSec:
        changes.heldOpenTimeoutSec !== undefined
          ? changes.heldOpenTimeoutSec
          : existing.heldOpenTimeoutSec,
      heldOpenPrewarnSec:
        changes.heldOpenPrewarnSec !== undefined
          ? changes.heldOpenPrewarnSec
          : existing.heldOpenPrewarnSec,
      rexGraceSec: changes.rexGraceSec ?? existing.rexGraceSec,
      isEgressRoute: changes.isEgressRoute ?? existing.isEgressRoute,
      releasesOnFire: changes.releasesOnFire ?? existing.releasesOnFire,
    });

    if (updatedRes.isErr()) {
      throw new BadRequestException(updatedRes.error.message);
    }

    this.lockProfilesMap.set(id, updatedRes.value);
    return updatedRes.value;
  }

  // Controllers
  public createController(dto: CreateControllerDto): Controller {
    const site = this.sitesMap.get(dto.siteId);
    if (!site) {
      throw new NotFoundException(`Site not found: ${dto.siteId}`);
    }

    const id = makeControllerId(`ctrl-${cryptoNativeOrRandomUUID()}`);
    const ctrlRes = Controller.create({
      id,
      siteId: makeSiteId(dto.siteId),
      name: dto.name,
      ipAddress: dto.ipAddress,
      model: dto.model,
      serialNumber: dto.serialNumber,
    });

    if (ctrlRes.isErr()) {
      throw new BadRequestException(ctrlRes.error.message);
    }

    this.controllersMap.set(ctrlRes.value.id, ctrlRes.value);
    return ctrlRes.value;
  }

  public getControllers(): Controller[] {
    return Array.from(this.controllersMap.values());
  }

  // Doors
  public createDoor(dto: CreateDoorDto): {
    door: Door;
    hierarchicalName: string;
  } {
    const site = this.sitesMap.get(dto.siteId);
    if (!site) throw new NotFoundException(`Site not found: ${dto.siteId}`);

    const controller = this.controllersMap.get(dto.controllerId);
    if (!controller)
      throw new NotFoundException(`Controller not found: ${dto.controllerId}`);

    const lockProfile = this.lockProfilesMap.get(dto.lockProfileId);
    if (!lockProfile)
      throw new NotFoundException(
        `LockProfile not found: ${dto.lockProfileId}`,
      );

    const zoneInside = this.zonesMap.get(dto.zoneInsideId);
    if (!zoneInside)
      throw new NotFoundException(`Zone not found: ${dto.zoneInsideId}`);

    const id = makeDoorId(`door-${cryptoNativeOrRandomUUID()}`);
    const doorRes = Door.create({
      id,
      siteId: makeSiteId(dto.siteId),
      controllerId: makeControllerId(dto.controllerId),
      lockProfileId: makeLockProfileId(dto.lockProfileId),
      zoneInsideId: makeZoneId(dto.zoneInsideId),
      zoneOutsideId: dto.zoneOutsideId ? makeZoneId(dto.zoneOutsideId) : null,
      name: dto.name,
      dpsSupervised: dto.dpsSupervised,
      rexSupervised: dto.rexSupervised,
    });

    if (doorRes.isErr()) {
      throw new BadRequestException(doorRes.error.message);
    }

    const door = doorRes.value;
    this.doorsMap.set(door.id, door);

    this.simulatorAdapter.registerVirtualDoor(
      door.id,
      controller.id,
      lockProfile,
    );

    const hierarchicalName = door.getHierarchicalName(
      site.code,
      zoneInside.name,
    );

    return { door, hierarchicalName };
  }

  public getDoors(): { door: Door; hierarchicalName: string }[] {
    return Array.from(this.doorsMap.values()).map((d) => {
      const site = this.sitesMap.get(d.siteId);
      const zone = this.zonesMap.get(d.zoneInsideId);
      return {
        door: d,
        hierarchicalName: d.getHierarchicalName(
          site?.code || 'SITE',
          zone?.name || 'ZONE',
        ),
      };
    });
  }

  // Readers
  public createReader(dto: CreateReaderDto): Reader {
    const door = this.doorsMap.get(dto.doorId);
    if (!door) throw new NotFoundException(`Door not found: ${dto.doorId}`);

    const id = makeReaderId(`reader-${cryptoNativeOrRandomUUID()}`);
    const readerRes = Reader.create({
      id,
      doorId: makeDoorId(dto.doorId),
      name: dto.name,
      protocol: dto.protocol,
      direction: dto.direction,
      riskAcceptedBy: dto.riskAcceptedBy,
      riskAcceptedAt: dto.riskAcceptedBy ? new Date() : null,
    });

    if (readerRes.isErr()) {
      throw new BadRequestException(readerRes.error.message);
    }

    this.readersMap.set(readerRes.value.id, readerRes.value);
    return readerRes.value;
  }

  public getReaders(): Reader[] {
    return Array.from(this.readersMap.values());
  }

  // Export / Import
  public exportConfig() {
    const config: ValidatedTopologyConfig = {
      organizations: Array.from(this.organizationsMap.values()),
      sites: Array.from(this.sitesMap.values()),
      zones: Array.from(this.zonesMap.values()),
      lockProfiles: Array.from(this.lockProfilesMap.values()),
      controllers: Array.from(this.controllersMap.values()),
      doors: Array.from(this.doorsMap.values()),
      readers: Array.from(this.readersMap.values()),
    };
    return exportTopologyConfig(config);
  }

  public importConfig(schema: any) {
    const res = importTopologyConfig(schema);
    if (res.isErr()) {
      throw new BadRequestException(
        `Import failed due to domain invariant violation: ${res.error.message}`,
      );
    }

    const { organizations, sites, zones, lockProfiles, controllers, doors, readers } =
      res.value;

    this.organizationsMap.clear();
    organizations.forEach((o) => this.organizationsMap.set(o.id, o));

    this.sitesMap.clear();
    sites.forEach((s) => this.sitesMap.set(s.id, s));

    this.zonesMap.clear();
    zones.forEach((z) => this.zonesMap.set(z.id, z));

    this.lockProfilesMap.clear();
    lockProfiles.forEach((lp) => this.lockProfilesMap.set(lp.id, lp));

    this.controllersMap.clear();
    controllers.forEach((c) => this.controllersMap.set(c.id, c));

    this.doorsMap.clear();
    doors.forEach((d) => {
      this.doorsMap.set(d.id, d);
      const lp = this.lockProfilesMap.get(d.lockProfileId);
      if (lp) {
        this.simulatorAdapter.registerVirtualDoor(d.id, d.controllerId, lp);
      }
    });

    this.readersMap.clear();
    readers.forEach((r) => this.readersMap.set(r.id, r));

    return { imported: true, totalDoors: doors.length };
  }

  public getConfigVersions(): ConfigVersionRecord[] {
    return this.configVersions;
  }
}
