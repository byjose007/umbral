import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DeviceGatewayService } from './device-gateway.service';
import { MqttDoorControllerAdapter } from './mqtt-door-controller.adapter';
import { TopologyService } from '../topology/topology.service';
import {
  ProvisionDeviceDto,
  RevokeCertificateDto,
  IngestEventDto,
  HeartbeatDto,
} from './dto/device-gateway.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { makeControllerId } from '@umbral/core';

@UseGuards(JwtAuthGuard)
@Controller('device-gateway')
export class DeviceGatewayController {
  constructor(
    private readonly deviceGatewayService: DeviceGatewayService,
    private readonly doorControllerAdapter: MqttDoorControllerAdapter,
    private readonly topologyService: TopologyService,
  ) {}

  /** GET /device-gateway/controllers — combined view (topology + provisioning + health) for the console UI. */
  @Get('controllers')
  listControllers(
    @Query('siteId') siteId?: string,
    @Query('serverMatrixVersion') serverMatrixVersion?: string,
  ) {
    const version = serverMatrixVersion ? parseInt(serverMatrixVersion, 10) : 1;
    return this.topologyService
      .getControllers()
      .map((c) => c.props)
      .filter((c) => !siteId || c.siteId === siteId)
      .map((c) => ({
        ...c,
        ...this.deviceGatewayService.getControllerStatus(c.id, version),
      }));
  }

  @Post('provision')
  provisionDevice(@Body() dto: ProvisionDeviceDto) {
    return this.deviceGatewayService.provisionDevice(dto);
  }

  @Post('revoke')
  revokeCertificate(@Body() dto: RevokeCertificateDto) {
    return this.deviceGatewayService.revokeCertificate(dto);
  }

  @Get('controllers/:id/topics')
  getMQTTTopics(@Param('id') id: string) {
    return this.deviceGatewayService.getMQTTTopics(id);
  }

  @Post('ingest-event')
  ingestEvent(@Body() dto: IngestEventDto) {
    return this.deviceGatewayService.ingestEvent(dto);
  }

  @Post('heartbeat')
  recordHeartbeat(
    @Body() dto: HeartbeatDto,
    @Query('serverMatrixVersion') serverMatrixVersion?: string,
  ) {
    const version = serverMatrixVersion ? parseInt(serverMatrixVersion, 10) : 1;
    return this.deviceGatewayService.recordHeartbeat(dto, version);
  }

  @Get('controllers/:id/health')
  getDeviceHealth(
    @Param('id') id: string,
    @Query('serverMatrixVersion') serverMatrixVersion?: string,
  ) {
    const version = serverMatrixVersion ? parseInt(serverMatrixVersion, 10) : 1;
    return this.deviceGatewayService.getDeviceHealth(id, version);
  }

  /** POST /device-gateway/controllers/:id/matrix — set and immediately push the compiled matrix to a controller over MQTT. */
  @Post('controllers/:id/matrix')
  async pushMatrix(@Param('id') id: string, @Body() matrix: Record<string, unknown>) {
    const result = await this.doorControllerAdapter.pushAccessMatrix(makeControllerId(id), matrix);
    if (result.isErr()) {
      throw result.error;
    }
    return this.deviceGatewayService.getControllerMatrix(id);
  }
}
