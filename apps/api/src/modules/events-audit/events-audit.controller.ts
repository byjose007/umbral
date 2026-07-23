import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { EventsAuditService } from './events-audit.service';
import {
  RecordEventDto,
  QueryEventsDto,
  VerifyChainDto,
  PurgeEventsDto,
} from './dto/events-audit.dto';

@Controller('events-audit')
export class EventsAuditController {
  constructor(private readonly eventsAuditService: EventsAuditService) {}

  @Post('record')
  recordEvent(@Body() dto: RecordEventDto) {
    return this.eventsAuditService.recordEvent(dto);
  }

  @Get('events')
  getEvents(
    @Query('chainPartition') chainPartition?: string,
    @Query('doorId') doorId?: string,
    @Query('personId') personId?: string,
    @Query('limit') limit?: string
  ) {
    return this.eventsAuditService.getEvents({
      chainPartition,
      doorId,
      personId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('verify-chain')
  verifyChain(@Body() dto: VerifyChainDto) {
    return this.eventsAuditService.verifyChain(dto);
  }

  @Post('purge')
  purgeEvents(@Body() dto: PurgeEventsDto) {
    return this.eventsAuditService.purgeEvents(dto);
  }
}
