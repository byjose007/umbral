import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AlertingController } from './alerting.controller';
import { AlertingService } from './alerting.service';
import { BadRequestException } from '@nestjs/common';

describe('AlertingModule', () => {
  let controller: AlertingController;
  let service: AlertingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertingController],
      providers: [AlertingService],
    }).compile();

    controller = module.get<AlertingController>(AlertingController);
    service = module.get<AlertingService>(AlertingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('creates alert rules, matches events, and deduplicates repeated alerts', () => {
    const siteId = 'site-101';
    controller.createRule({
      siteId,
      name: 'Puerta Forzada DFO',
      eventType: 'door.forced_open',
      severity: 'critical',
      dedupWindowSec: 60,
    });

    const res1 = controller.processEvent({
      siteId,
      doorId: 'door-1',
      eventType: 'door.forced_open',
    });

    expect(res1.alertsGenerated).toBe(1);
    expect(res1.alerts[0].severity).toBe('critical');

    // Duplicate event within dedup window (60s)
    const res2 = controller.processEvent({
      siteId,
      doorId: 'door-1',
      eventType: 'door.forced_open',
    });

    expect(res2.alertsGenerated).toBe(0); // Deduplicated!
  });

  it('acknowledges active alerts and audits PII reveal explicitly for LOPDP compliance', () => {
    const siteId = 'site-202';
    controller.createRule({
      siteId,
      name: 'Falla de Línea Supervisada',
      eventType: 'input.fault',
      severity: 'critical',
    });

    const proc = controller.processEvent({
      siteId,
      eventType: 'input.fault',
      rawPersonId: 'p-secret-123',
    });

    const alertId = proc.alerts[0].id;
    expect(proc.alerts[0].pseudonymizedPersonId).toMatch(/^USR-[A-Z0-9]{6}$/);

    // Operator acknowledges alert
    const acked = controller.acknowledgeAlert(alertId, {
      operatorUser: 'admin.byron',
    });
    expect(acked.status).toBe('acknowledged');
    expect(acked.acknowledgedBy).toBe('admin.byron');

    // Operator reveals PII (audited)
    const revealed = controller.revealPii(alertId, {
      operatorUser: 'admin.byron',
    });
    expect(revealed.rawPersonId).toBe('p-secret-123');

    const logs = controller.getPiiAuditLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].operatorUser).toBe('admin.byron');
    expect(logs[0].revealedPersonId).toBe('p-secret-123');
  });
});
