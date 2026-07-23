import { Module } from '@nestjs/common';
import { EventsAuditController } from './events-audit.controller';
import { EventsAuditService } from './events-audit.service';

@Module({
  controllers: [EventsAuditController],
  providers: [EventsAuditService],
  exports: [EventsAuditService],
})
export class EventsAuditModule {}
