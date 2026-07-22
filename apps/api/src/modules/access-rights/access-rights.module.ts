import { Module } from '@nestjs/common';
import { AccessRightsController } from './access-rights.controller';
import { AccessRightsService } from './access-rights.service';

@Module({
  controllers: [AccessRightsController],
  providers: [AccessRightsService],
  exports: [AccessRightsService],
})
export class AccessRightsModule {}
