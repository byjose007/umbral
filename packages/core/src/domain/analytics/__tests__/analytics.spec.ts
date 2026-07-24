import { describe, it, expect } from 'vitest';
import {
  FlowAggregator,
  ZoneOccupancyTracker,
  PersonTrajectoryTracker,
  AnomalyDetector,
  SystemHealthAggregator,
  ReportExporter,
  UnauthorizedTrajectoryAccessError,
} from '../index.js';
import { AccessEvent } from '../../events-audit/access-event.entity.js';
import { makeAccessEventId } from '../../events-audit/ids.js';
import { makeSiteId, makeDoorId } from '../../topology/ids.js';
import { makePersonId } from '../../identity/ids.js';
import { computeEventHash, GENESIS_HASH } from '../../events-audit/hash-chain.js';

describe('Analytics Domain Suite', () => {

  const buildEvent = (idStr: string, personIdVal: string, dir: 'in' | 'out', ts: Date, site: string = 'site-1', door: string = 'door-1') => {
    const eventId = makeAccessEventId(idStr);
    const payloadStr = JSON.stringify({});
    const currentHash = computeEventHash(GENESIS_HASH, eventId, ts.toISOString(), 'access.granted', payloadStr);
    return AccessEvent.create({
      id: eventId,
      chainPartition: site,
      sequenceNumber: 1,
      previousHash: GENESIS_HASH,
      currentHash,
      eventType: 'access.granted',
      siteId: makeSiteId(site),
      doorId: makeDoorId(door),
      personId: makePersonId(personIdVal),
      direction: dir,
      timestamp: ts,
    })._unsafeUnwrap();
  };

  describe('Flow Aggregation & Peak Day', () => {
    it('aggregates daily flow and identifies peak flow day', () => {
      const e1 = buildEvent('e1', 'person-1', 'in', new Date('2026-07-01T08:00:00Z'));
      const e2 = buildEvent('e2', 'person-1', 'out', new Date('2026-07-01T17:00:00Z'));
      const e3 = buildEvent('e3', 'person-2', 'in', new Date('2026-07-02T09:00:00Z'));
      const e4 = buildEvent('e4', 'person-2', 'out', new Date('2026-07-02T18:00:00Z'));
      const e5 = buildEvent('e5', 'person-1', 'in', new Date('2026-07-02T10:00:00Z'));

      const bucketsMap = FlowAggregator.aggregateByDay([e1, e2, e3, e4, e5]);
      expect(bucketsMap.size).toBe(2);

      const buckets = Array.from(bucketsMap.values());
      const peakDay = FlowAggregator.findPeakFlowDay(buckets);

      expect(peakDay).not.toBeNull();
      expect(peakDay?.date).toBe('2026-07-02');
      expect(peakDay?.totalFlow).toBe(3);
    });
  });

  describe('Server-side Muster & Zone Occupancy', () => {
    it('calculates real-time occupancy and generates server muster roll matching online state', () => {
      const e1 = buildEvent('e1', 'person-1', 'in', new Date('2026-07-23T08:00:00Z'));
      const e2 = buildEvent('e2', 'person-2', 'in', new Date('2026-07-23T08:05:00Z'));
      const e3 = buildEvent('e3', 'person-1', 'out', new Date('2026-07-23T12:00:00Z'));

      const muster = ZoneOccupancyTracker.generateServerMusterRoll([e1, e2, e3], 'site-1');
      expect(muster.totalInside).toBe(1);
      expect(muster.personIds).toEqual(['person-2']);
    });
  });

  describe('Person Trajectory Tracking & PII Audit', () => {
    it('returns trajectory for authorized operator and logs PII audit disclosure', () => {
      const e1 = buildEvent('e1', 'person-1', 'in', new Date('2026-07-23T08:00:00Z'));
      const e2 = buildEvent('e2', 'person-1', 'out', new Date('2026-07-23T17:00:00Z'));

      const result = PersonTrajectoryTracker.getTrajectory(
        [e1, e2],
        'person-1',
        'op-supervisor',
        ['security_supervisor'],
        'Investigation of incident #102'
      );

      expect(result.isOk()).toBe(true);
      const { trajectory, auditLog } = result._unsafeUnwrap();
      expect(trajectory.totalSteps).toBe(2);
      expect(auditLog.accessType).toBe('TRAJECTORY_QUERY');
    });

    it('denies trajectory query for operator without tracking permission', () => {
      const e1 = buildEvent('e1', 'person-1', 'in', new Date('2026-07-23T08:00:00Z'));

      const result = PersonTrajectoryTracker.getTrajectory(
        [e1],
        'person-1',
        'op-garita',
        ['garita_operator'],
        'Unapproved query'
      );

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(UnauthorizedTrajectoryAccessError);
    });
  });

  describe('Anomaly Detection', () => {
    it('detects orphaned access and impossible travel between sites', () => {
      // Orphaned access: entry twice without exit
      const e1 = buildEvent('e1', 'person-1', 'in', new Date('2026-07-23T08:00:00Z'), 'site-1');
      const e2 = buildEvent('e2', 'person-1', 'in', new Date('2026-07-23T08:00:30Z'), 'site-2'); // 30s later at site-2

      const anomalies = AnomalyDetector.detectAnomalies([e1, e2]);
      expect(anomalies.length).toBeGreaterThanOrEqual(2);

      const orphan = anomalies.find(a => a.type === 'ORPHANED_ACCESS');
      const travel = anomalies.find(a => a.type === 'IMPOSSIBLE_TRAVEL');

      expect(orphan).toBeDefined();
      expect(travel).toBeDefined();
      expect(travel?.severity).toBe('high');
    });
  });

  describe('System Health & Capacity Dashboard', () => {
    it('computes health percentage and degrades status when devices are offline', () => {
      const controllers = [{ id: 'c1', isOnline: true }, { id: 'c2', isOnline: false }];
      const readers = [{ id: 'r1', isOnline: true }, { id: 'r2', isOnline: true }];
      const doors = [{ id: 'd1', isOnline: true }];

      const dashboard = SystemHealthAggregator.computeDashboard(
        controllers,
        readers,
        doors,
        { activeCount: 150, totalCount: 200 },
        { activeCount: 5, totalCount: 10 }
      );

      expect(dashboard.controllers.healthPercentage).toBe(50);
      expect(dashboard.overallStatus).toBe('CRITICAL');

      const grafanaConfig = SystemHealthAggregator.getGrafanaDashboardConfig();
      expect(grafanaConfig.dashboardTitle).toContain('UMBRAL');
    });
  });

  describe('Report Exporting', () => {
    it('exports rows to CSV and JSON formats', () => {
      const rows = [
        { id: '1', name: 'Zone A', count: 12 },
        { id: '2', name: 'Zone B', count: 4 },
      ];

      const csv = ReportExporter.exportToCsv(rows);
      expect(csv).toContain('id,name,count');
      expect(csv).toContain('"Zone A"');

      const json = ReportExporter.exportToJson(rows);
      expect(json).toContain('"Zone B"');
    });
  });
});
