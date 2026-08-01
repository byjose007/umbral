import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { TopologyService } from './topology.service';
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
  GrantAccessDto,
} from './dto/topology.dto';
import { makeDoorId } from '@umbral/core';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('topology')
export class TopologyController {
  constructor(private readonly topologyService: TopologyService) {}

  // Organizations
  @Post('organizations')
  createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.topologyService.createOrganization(dto).publicProps;
  }

  @Get('organizations')
  getOrganizations() {
    return this.topologyService.getOrganizations();
  }

  // Sites
  @Post('sites')
  createSite(@Body() dto: CreateSiteDto) {
    return this.topologyService.createSite(dto);
  }

  @Get('sites')
  getSites() {
    return this.topologyService.getSites();
  }

  // Zones
  @Post('zones')
  createZone(@Body() dto: CreateZoneDto) {
    return this.topologyService.createZone(dto);
  }

  @Get('zones')
  getZones() {
    return this.topologyService.getZones();
  }

  // Lock Profiles
  @Post('lock-profiles')
  createLockProfile(@Body() dto: CreateLockProfileDto) {
    return this.topologyService.createLockProfile(dto);
  }

  @Get('lock-profiles')
  getLockProfiles() {
    return this.topologyService.getLockProfiles();
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @Post('lock-profiles/propose')
  proposeLockProfileChange(@Body() dto: ProposeLifeSafetyChangeDto) {
    return this.topologyService.proposeLockProfileChange(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @Post('lock-profiles/approve')
  approveLockProfileChange(@Body() dto: ApproveLifeSafetyChangeDto) {
    return this.topologyService.approveLockProfileChange(dto);
  }

  // Controllers
  @Post('controllers')
  createController(@Body() dto: CreateControllerDto) {
    return this.topologyService.createController(dto);
  }

  @Get('controllers')
  getControllers() {
    return this.topologyService.getControllers();
  }

  // Doors
  @Post('doors')
  createDoor(@Body() dto: CreateDoorDto) {
    return this.topologyService.createDoor(dto);
  }

  @Get('doors')
  getDoors() {
    return this.topologyService.getDoors();
  }

  // Readers
  @Post('readers')
  createReader(@Body() dto: CreateReaderDto) {
    return this.topologyService.createReader(dto);
  }

  @Get('readers')
  getReaders() {
    return this.topologyService.getReaders();
  }

  // Simulator
  @Post('simulator/grant-access')
  async grantAccess(@Body() dto: GrantAccessDto) {
    await this.topologyService.simulatorAdapter.grantAccess(
      makeDoorId(dto.doorId),
      dto.durationMs,
    );
    return { success: true, doorId: dto.doorId };
  }

  @Post('simulator/forced-open/:doorId')
  simulateForcedOpen(@Param('doorId') doorId: string) {
    this.topologyService.simulatorAdapter.simulateForcedOpen(
      makeDoorId(doorId),
    );
    return { success: true, doorId, event: 'door.forced_open' };
  }

  // Export / Import
  @Get('export')
  exportConfig() {
    return this.topologyService.exportConfig();
  }

  @Post('import')
  importConfig(@Body() body: any) {
    return this.topologyService.importConfig(body);
  }

  @Get('config-versions')
  getConfigVersions() {
    return this.topologyService.getConfigVersions();
  }
}
