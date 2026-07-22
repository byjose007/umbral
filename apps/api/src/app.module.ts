import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TopologyModule } from './modules/topology/topology.module';
import { DecisionModule } from './modules/decision/decision.module';
import { IdentityModule } from './modules/identity/identity.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { AccessRightsModule } from './modules/access-rights/access-rights.module';

@Module({
  imports: [
    TopologyModule,
    DecisionModule,
    IdentityModule,
    CredentialsModule,
    AccessRightsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}



