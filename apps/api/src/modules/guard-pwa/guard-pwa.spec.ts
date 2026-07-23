import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { GuardPwaController } from './guard-pwa.controller';
import { GuardPwaService } from './guard-pwa.service';
import { generateOfflineDynamicQRToken } from '@umbral/core';

describe('GuardPwaModule', () => {
  let controller: GuardPwaController;
  let service: GuardPwaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuardPwaController],
      providers: [GuardPwaService],
    }).compile();

    controller = module.get<GuardPwaController>(GuardPwaController);
    service = module.get<GuardPwaService>(GuardPwaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('should return sync data including occupancy, CRL and seed secret', () => {
    const data = controller.getSyncData('SITE-MAIN');
    expect(data.siteId).toBe('SITE-MAIN');
    expect(data.seedSecret).toBeDefined();
    expect(data.crlList).toBeInstanceOf(Array);
    expect(data.occupants.length).toBeGreaterThan(0);
  });

  it('should save emergency muster roll snapshot', () => {
    const result = controller.saveMusterSnapshot({
      siteId: 'SITE-MAIN',
      initiatedBy: 'Chief Security Officer',
      occupantsSnapshot: [
        {
          personId: 'PER-1001',
          pseudonym: 'USR-A9F32',
          zoneId: 'ZONE-A-MAIN',
          status: 'present_inside',
        },
        {
          personId: 'PER-1002',
          pseudonym: 'USR-B821C',
          zoneId: 'ZONE-B-LAB',
          status: 'evacuated_accounted',
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.snapshotId).toContain('muster-');
    expect(service.getSavedMusterSnapshots().length).toBe(1);
  });

  it('should record manual contingency gate release log', () => {
    const result = controller.recordOverrideLog({
      guardPersonId: 'GRD-900',
      targetPersonId: 'PER-1001',
      targetDocument: '1712345678',
      doorId: 'DOOR-GATE-MAIN',
      reason: 'Physical barrier power outage override',
      action: 'manual_contingency_grant',
    });

    expect(result.success).toBe(true);
    expect(result.logId).toContain('log-');
    expect(service.getSavedOverrideLogs().length).toBe(1);
  });

  it('should return active pseudonymous alerts', () => {
    const alerts = controller.getActiveAlerts('SITE-MAIN');
    expect(alerts.length).toBe(2);
    expect(alerts[0]!.pseudonym).toBe('USR-A9F32');
  });

  it('should verify QR token using service', () => {
    const seed = 'secret-key-12345678901234567890';
    const { token } = generateOfflineDynamicQRToken(seed, 'PER-1001');

    const res = controller.verifyToken(token);
    expect(res.valid).toBe(true);
    expect(res.personId).toBe('PER-1001');
  });
});
