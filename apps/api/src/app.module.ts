import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TopologyModule } from './modules/topology/topology.module';
import { DecisionModule } from './modules/decision/decision.module';
import { IdentityModule } from './modules/identity/identity.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { AccessRightsModule } from './modules/access-rights/access-rights.module';
import { DeviceGatewayModule } from './modules/device-gateway/device-gateway.module';
import { EventsAuditModule } from './modules/events-audit/events-audit.module';
import { AlertingModule } from './modules/alerting/alerting.module';
import { UserPassModule } from './modules/user-pass/user-pass.module';

@Module({
  imports: [
    TopologyModule,
    DecisionModule,
    IdentityModule,
    CredentialsModule,
    AccessRightsModule,
    DeviceGatewayModule,
    EventsAuditModule,
    AlertingModule,
    UserPassModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}







