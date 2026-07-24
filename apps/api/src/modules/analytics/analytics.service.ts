import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  FlowAggregator,
  FlowBucket,
  PeakFlowDayResult,
  ZoneOccupancyTracker,
  PersonTrajectoryTracker,
  PersonTrajectoryResult,
  AnomalyDetector,
  AccessAnomaly,
  SystemHealthAggregator,
  SystemHealthDashboard,
  GrafanaDashboardConfig,
  SavedReportFilter,
  makeSavedFilterId,
  ReportExporter,
  AccessEvent,
  makeAccessEventId,
  makeSiteId,
  makeDoorId,
  makePersonId,
  computeEventHash,
  GENESIS_HASH,
} from '@umbral/core';
import {
  QueryFlowAggregatesDto,
  QueryTrajectoryDto,
  SaveFilterDto,
  ExportReportDto,
} from './dto/analytics.dto.js';

@Injectable()
export class AnalyticsService {
  private events: AccessEvent[] = [];
  private savedFilters = new Map<string, SavedReportFilter>();

  constructor() {
    this.seedMockData();
  }

  private seedMockData() {
    const siteId = makeSiteId('site-main');
    const doorIn = makeDoorId('door-gate-1');
    const doorOut = makeDoorId('door-gate-2');

    const persons = ['person-alice', 'person-bob', 'person-charlie'];
    const days = ['2026-07-21', '2026-07-22', '2026-07-23'];

    let seq = 1;
    let prevHash = GENESIS_HASH;

    for (const d of days) {
      for (const p of persons) {
        const inTime = new Date(`${d}T08:30:00Z`);
        const eInId = makeAccessEventId(`evt-in-${seq}`);
        const payloadIn = JSON.stringify({});
        const hashIn = computeEventHash(
          prevHash,
          eInId,
          inTime.toISOString(),
          'access.granted',
          payloadIn,
        );

        const evIn = AccessEvent.create({
          id: eInId,
          chainPartition: 'site-main',
          sequenceNumber: seq++,
          previousHash: prevHash,
          currentHash: hashIn,
          eventType: 'access.granted',
          siteId,
          doorId: doorIn,
          personId: makePersonId(p),
          direction: 'in',
          timestamp: inTime,
        })._unsafeUnwrap();

        this.events.push(evIn);
        prevHash = hashIn;

        if (p !== 'person-charlie' || d !== '2026-07-23') {
          const outTime = new Date(`${d}T17:30:00Z`);
          const eOutId = makeAccessEventId(`evt-out-${seq}`);
          const payloadOut = JSON.stringify({});
          const hashOut = computeEventHash(
            prevHash,
            eOutId,
            outTime.toISOString(),
            'access.granted',
            payloadOut,
          );

          const evOut = AccessEvent.create({
            id: eOutId,
            chainPartition: 'site-main',
            sequenceNumber: seq++,
            previousHash: prevHash,
            currentHash: hashOut,
            eventType: 'access.granted',
            siteId,
            doorId: doorOut,
            personId: makePersonId(p),
            direction: 'out',
            timestamp: outTime,
          })._unsafeUnwrap();

          this.events.push(evOut);
          prevHash = hashOut;
        }
      }
    }
  }

  public addEvent(event: AccessEvent) {
    this.events.push(event);
  }

  // --- FLOW AGGREGATES & PEAK DAY ---

  public getFlowAggregates(dto?: QueryFlowAggregatesDto): FlowBucket[] {
    const bucketsMap = FlowAggregator.aggregateByDay(this.events);
    return Array.from(bucketsMap.values());
  }

  public getPeakFlowDay(
    dto?: QueryFlowAggregatesDto,
  ): PeakFlowDayResult | null {
    const buckets = this.getFlowAggregates(dto);
    return FlowAggregator.findPeakFlowDay(buckets);
  }

  // --- OCCUPANCY & MUSTER ---

  public getZoneOccupancy(siteId?: string) {
    return ZoneOccupancyTracker.calculateOccupancy(this.events, siteId);
  }

  public getServerMusterRoll(siteId?: string) {
    return ZoneOccupancyTracker.generateServerMusterRoll(this.events, siteId);
  }

  // --- PERSON TRAJECTORY ---

  public getPersonTrajectory(
    personId: string,
    dto: QueryTrajectoryDto,
  ): PersonTrajectoryResult {
    const roles = dto.operatorRoles ?? ['operator'];
    const res = PersonTrajectoryTracker.getTrajectory(
      this.events,
      personId,
      dto.operatorId,
      roles,
      dto.justification,
    );

    if (res.isErr()) {
      throw new ForbiddenException(res.error.message);
    }

    return res.value.trajectory;
  }

  // --- ANOMALIES ---

  public getAnomalies(): AccessAnomaly[] {
    return AnomalyDetector.detectAnomalies(this.events);
  }

  // --- HEALTH DASHBOARD ---

  public getHealthDashboard(): SystemHealthDashboard {
    const controllers = [
      { id: 'ctrl-1', isOnline: true },
      { id: 'ctrl-2', isOnline: true },
      { id: 'ctrl-3', isOnline: false },
    ];
    const readers = [
      { id: 'rdr-1', isOnline: true },
      { id: 'rdr-2', isOnline: true },
      { id: 'rdr-3', isOnline: true },
    ];
    const doors = [
      { id: 'door-1', isOnline: true },
      { id: 'door-2', isOnline: true },
    ];

    return SystemHealthAggregator.computeDashboard(
      controllers,
      readers,
      doors,
      { activeCount: 240, totalCount: 250 },
      { activeCount: 12, totalCount: 15 },
    );
  }

  public getGrafanaConfig(): GrafanaDashboardConfig {
    return SystemHealthAggregator.getGrafanaDashboardConfig();
  }

  // --- REPORTS & FILTERS ---

  public saveReportFilter(dto: SaveFilterDto): SavedReportFilter {
    const id = makeSavedFilterId(`filter-${Date.now()}`);
    const filter = new SavedReportFilter({
      id,
      name: dto.name,
      createdByOperatorId: dto.operatorId,
      siteId: dto.siteId,
      dateRangeDays: dto.dateRangeDays ?? 30,
      isScheduled: dto.isScheduled ?? false,
      cronSchedule: dto.cronSchedule,
      exportFormat: dto.exportFormat ?? 'json',
      createdAt: new Date(),
    });

    this.savedFilters.set(id, filter);
    return filter;
  }

  public getSavedFilters(): SavedReportFilter[] {
    return Array.from(this.savedFilters.values());
  }

  public exportReport(dto: ExportReportDto): { format: string; data: string } {
    let dataObj: Record<string, unknown>[] = [];

    if (dto.reportType === 'flow') {
      const buckets = this.getFlowAggregates();
      dataObj = buckets.map((b) => ({ ...b }));
    } else if (dto.reportType === 'occupancy') {
      const muster = this.getServerMusterRoll();
      dataObj = muster.occupants.map((o) => ({ ...o }));
    } else if (dto.reportType === 'anomalies') {
      const anomalies = this.getAnomalies();
      dataObj = anomalies.map((a) => ({ ...a }));
    } else if (dto.reportType === 'health') {
      const health = this.getHealthDashboard();
      dataObj = [
        {
          resource: 'controllers',
          online: health.controllers.onlineCount,
          total: health.controllers.totalCount,
        },
        {
          resource: 'readers',
          online: health.readers.onlineCount,
          total: health.readers.totalCount,
        },
      ];
    }

    const format = dto.format ?? 'json';
    if (format === 'csv') {
      return { format: 'csv', data: ReportExporter.exportToCsv(dataObj) };
    }
    return { format: 'json', data: ReportExporter.exportToJson(dataObj) };
  }
}
