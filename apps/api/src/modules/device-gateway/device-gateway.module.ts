import { Module } from '@nestjs/common';
import { DeviceGatewayController } from './device-gateway.controller';
import { DeviceGatewayService } from './device-gateway.service';
import { MqttClientService } from './mqtt-client.service';
import { MqttDoorControllerAdapter } from './mqtt-door-controller.adapter';
import { TopologyModule } from '../topology/topology.module';

@Module({
  imports: [TopologyModule],
  controllers: [DeviceGatewayController],
  providers: [DeviceGatewayService, MqttClientService, MqttDoorControllerAdapter],
  exports: [DeviceGatewayService, MqttDoorControllerAdapter],
})
export class DeviceGatewayModule {}
