import { Module } from '@nestjs/common';
import { DeviceGatewayController } from './device-gateway.controller';
import { DeviceGatewayService } from './device-gateway.service';

@Module({
  controllers: [DeviceGatewayController],
  providers: [DeviceGatewayService],
  exports: [DeviceGatewayService],
})
export class DeviceGatewayModule {}
