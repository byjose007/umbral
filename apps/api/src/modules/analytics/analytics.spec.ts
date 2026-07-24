import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';

describe('Analytics Module (API)', () => {
  let service: AnalyticsService;
  let controller: AnalyticsController;

  beforeEach(() => {
    service = new AnalyticsService();
    controller = new AnalyticsController(service);
  });

  describe('Flow Aggregates & Peak Day', () => {
    it('returns daily flow aggregates and identifies peak flow day', () => {
      const aggregates = controller.getFlowAggregates({});
      expect(aggregates.length).toBeGreaterThanOrEqual(3);

      const peak = controller.getPeakFlowDay({});
      expect(peak).not.toBeNull();
      expect(peak?.date).toBeDefined();
    });
  });

  describe('Server-side Muster & Occupancy', () => {
    it('returns zone occupancy and server muster roll', () => {
      const muster = controller.getServerMusterRoll();
      expect(muster.siteId).toBe('global');
      expect(muster.totalInside).toBeGreaterThanOrEqual(0);
      expect(muster.generatedAt).toBeDefined();
    });
  });

  describe('Person Trajectory Tracking', () => {
    it('returns person trajectory for authorized operator', () => {
      const trajectory = controller.getPersonTrajectory('person-alice', {
        operatorId: 'op-supervisor-1',
        operatorRoles: ['security_supervisor'],
        justification: 'Audit of entry trajectory',
      });

      expect(trajectory.personId).toBe('person-alice');
      expect(trajectory.totalSteps).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Health Dashboard & Grafana', () => {
    it('returns operational health dashboard metrics and Grafana embed config', () => {
      const health = controller.getHealthDashboard();
      expect(health.controllers.onlineCount).toBe(2);
      expect(health.controllers.totalCount).toBe(3);

      const grafana = controller.getGrafanaConfig();
      expect(grafana.embedUrl).toContain('grafana');
      expect(grafana.panels.length).toBe(4);
    });
  });

  describe('Saved Filters & Exporting', () => {
    it('saves a report filter and exports report in CSV format', () => {
      const filter = controller.saveReportFilter({
        operatorId: 'op-analyst',
        name: 'Weekly Occupancy Report',
        isScheduled: true,
        exportFormat: 'csv',
      });

      expect(filter.name).toBe('Weekly Occupancy Report');

      const exported = controller.exportReport({
        reportType: 'flow',
        format: 'csv',
      });

      expect(exported.format).toBe('csv');
      expect(exported.data).toContain('bucketKey');
    });
  });
});
