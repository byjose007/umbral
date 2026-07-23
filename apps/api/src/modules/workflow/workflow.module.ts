import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { PortalController } from './portal.controller';
import { WorkflowService } from './workflow.service';
import { IdentityModule } from '../identity/identity.module';
import { AccessRightsModule } from '../access-rights/access-rights.module';

@Module({
  imports: [IdentityModule, AccessRightsModule],
  controllers: [WorkflowController, PortalController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
