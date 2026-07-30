import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DeviceGatewayService } from './device-gateway.service';
import {
  ProvisionDeviceDto,
  RevokeCertificateDto,
  IngestEventDto,
  HeartbeatDto,
} from './dto/device-gateway.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('device-gateway')
export class DeviceGatewayController {
  constructor(private readonly deviceGatewayService: DeviceGatewayService) {}

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
}
