import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsAuditService } from './events-audit.service';
import {
  RecordEventDto,
  QueryEventsDto,
  VerifyChainDto,
  PurgeEventsDto,
  RevealEventPiiDto,
} from './dto/events-audit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
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
    @Query('limit') limit?: string,
  ) {
    return this.eventsAuditService.getEvents({
      chainPartition,
      doorId,
      personId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('feed')
  getFeed(@Query('siteId') siteId?: string, @Query('limit') limit?: string) {
    return this.eventsAuditService.getFeed({
      siteId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('events/:id/reveal-pii')
  revealPii(@Param('id') id: string, @Body() dto: RevealEventPiiDto) {
    return this.eventsAuditService.revealEventPii(id, dto);
  }

  @Get('pii-audit-logs')
  getPiiAuditLogs() {
    return this.eventsAuditService.getPiiAuditLogs();
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
