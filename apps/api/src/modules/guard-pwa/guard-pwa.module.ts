import { Module } from '@nestjs/common';
import { GuardPwaController } from './guard-pwa.controller';
import { GuardPwaService } from './guard-pwa.service';
import { TopologyModule } from '../topology/topology.module';
import { AccessMatrixModule } from '../access-matrix/access-matrix.module';
import { DecisionModule } from '../decision/decision.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [TopologyModule, AccessMatrixModule, DecisionModule, IdentityModule],
  controllers: [GuardPwaController],
  providers: [GuardPwaService],
  exports: [GuardPwaService],
})
export class GuardPwaModule {}
