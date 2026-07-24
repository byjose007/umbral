import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import {
  QueryFlowAggregatesDto,
  QueryTrajectoryDto,
  SaveFilterDto,
  ExportReportDto,
} from './dto/analytics.dto.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // --- FLOW & PEAK DAY ---

  @Get('flow/aggregates')
  getFlowAggregates(@Query() query: QueryFlowAggregatesDto) {
    return this.analyticsService.getFlowAggregates(query);
  }

  @Get('flow/peak-day')
  getPeakFlowDay(@Query() query: QueryFlowAggregatesDto) {
    return this.analyticsService.getPeakFlowDay(query);
  }

  // --- OCCUPANCY & MUSTER ---

  @Get('occupancy/zones')
  getZoneOccupancy(@Query('siteId') siteId?: string) {
    return this.analyticsService.getZoneOccupancy(siteId);
  }

  @Get('muster')
  getServerMusterRoll(@Query('siteId') siteId?: string) {
    return this.analyticsService.getServerMusterRoll(siteId);
  }

  // --- TRAJECTORY TRACKING ---

  @Post('trajectory/:personId')
  getPersonTrajectory(
    @Param('personId') personId: string,
    @Body() dto: QueryTrajectoryDto,
  ) {
    return this.analyticsService.getPersonTrajectory(personId, dto);
  }

  // --- ANOMALIES ---

  @Get('anomalies')
  getAnomalies() {
    return this.analyticsService.getAnomalies();
  }

  // --- HEALTH DASHBOARD & GRAFANA ---

  @Get('health-dashboard')
  getHealthDashboard() {
    return this.analyticsService.getHealthDashboard();
  }

  @Get('grafana-config')
  getGrafanaConfig() {
    return this.analyticsService.getGrafanaConfig();
  }

  // --- REPORTS & FILTERS ---

  @Get('reports/filters')
  getSavedFilters() {
    return this.analyticsService.getSavedFilters();
  }

  @Post('reports/filters')
  saveReportFilter(@Body() dto: SaveFilterDto) {
    return this.analyticsService.saveReportFilter(dto);
  }

  @Post('reports/export')
  exportReport(@Body() dto: ExportReportDto) {
    return this.analyticsService.exportReport(dto);
  }
}
