import { Module } from '@nestjs/common';
import { HrisSyncController } from './hris-sync.controller.js';
import { HrisSyncService } from './hris-sync.service.js';

@Module({
  controllers: [HrisSyncController],
  providers: [HrisSyncService],
  exports: [HrisSyncService],
})
export class HrisSyncModule {}
