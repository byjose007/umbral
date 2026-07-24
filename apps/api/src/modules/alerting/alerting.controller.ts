import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AlertingService } from './alerting.service';
import {
  CreateAlertRuleDto,
  EvaluateEventDto,
  AcknowledgeAlertDto,
  RevealPiiDto,
} from './dto/alerting.dto';
import { EventSeverity } from '@umbral/core';

@Controller('alerting')
export class AlertingController {
  constructor(private readonly alertingService: AlertingService) {}

  @Post('rules')
  createRule(@Body() dto: CreateAlertRuleDto) {
    return this.alertingService.createRule(dto);
  }

  @Get('rules')
  getRules(@Query('siteId') siteId?: string) {
    return this.alertingService.getRules(siteId);
  }

  @Post('process-event')
  processEvent(@Body() dto: EvaluateEventDto) {
    return this.alertingService.processEvent(dto);
  }

  @Get('alerts')
  getAlerts(
    @Query('siteId') siteId?: string,
    @Query('severity') severity?: EventSeverity,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.alertingService.getAlerts({
      siteId,
      severity,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('alerts/:id/ack')
  acknowledgeAlert(@Param('id') id: string, @Body() dto: AcknowledgeAlertDto) {
    return this.alertingService.acknowledgeAlert(id, dto);
  }

  @Post('alerts/:id/reveal-pii')
  revealPii(@Param('id') id: string, @Body() dto: RevealPiiDto) {
    return this.alertingService.revealPii(id, dto);
  }

  @Get('pii-audit-logs')
  getPiiAuditLogs() {
    return this.alertingService.getPiiAuditLogs();
  }
}
