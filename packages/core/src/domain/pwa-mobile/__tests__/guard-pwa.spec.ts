import { describe, it, expect } from 'vitest';
import {
  verifyGuardQRTokenOffline,
  GuardOverrideLog,
  PseudonymizedAlert,
  MusterRoll,
  generateOfflineDynamicQRToken,
} from '../../../index.js';

describe('Guard PWA Domain Unit Tests', () => {
  const seedSecret = 'secret-key-12345678901234567890';
  const personId = 'PER-1001';

  it('should verify valid dynamic QR token offline', () => {
    const { token } = generateOfflineDynamicQRToken(seedSecret, personId);
    const crlList: string[] = [];

    const result = verifyGuardQRTokenOffline(token, seedSecret, crlList);
    expect(result.valid).toBe(true);
    expect(result.personId).toBe(personId);
    expect(result.reason).toBe('OK');
  });

  it('should reject QR token if person is in CRL (Certificate Revocation List)', () => {
    const { token } = generateOfflineDynamicQRToken(seedSecret, personId);
    const crlList = ['PER-1001', 'PER-9999'];

    const result = verifyGuardQRTokenOffline(token, seedSecret, crlList);
    expect(result.valid).toBe(false);
    expect(result.personId).toBe(personId);
    expect(result.reason).toBe('REVOKED_IN_CRL');
  });

  it('should reject invalid or tampered QR token offline', () => {
    const result = verifyGuardQRTokenOffline('INVALID-TOKEN-FORMAT', seedSecret, []);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('EXPIRED_OR_INVALID');
  });

  it('should create GuardOverrideLog for manual contingency gate release', () => {
    const logResult = GuardOverrideLog.create({
      id: 'log-001',
      guardPersonId: 'GRD-501',
      targetPersonId: 'PER-1001',
      targetDocument: '1712345678',
      doorId: 'DOOR-MAIN-ENTRANCE',
      reason: 'Network outage contingency authorization',
      action: 'manual_contingency_grant',
    });

    expect(logResult.isOk()).toBe(true);
    if (logResult.isOk()) {
      const log = logResult.value;
      expect(log.props.id).toBe('log-001');
      expect(log.props.action).toBe('manual_contingency_grant');
    }
  });

  it('should handle LOPDP DP-06 pseudonymized alert and audit identity unmasking', () => {
    const alertResult = PseudonymizedAlert.create({
      alertId: 'ALT-888',
      type: 'FORCED_DOOR',
      severity: 'high',
      personId: 'PER-1001',
      pseudonym: 'USR-A9F32',
      realFullName: 'Byron Perez',
      realDocument: '1712345678',
      zoneId: 'ZONE-NORTH-SERVER',
      timestamp: new Date(),
    });

    expect(alertResult.isOk()).toBe(true);
    if (alertResult.isOk()) {
      const alert = alertResult.value;
      expect(alert.getDisplayName()).toBe('USR-A9F32');
      expect(alert.getDisplayDocument()).toBe('***-LOPDP-MASKED-***');

      // Audit unmasking
      const { alert: unmaskedAlert, auditLog } = alert.unmaskWithAudit('GRD-501');
      expect(unmaskedAlert.getDisplayName()).toBe('Byron Perez');
      expect(unmaskedAlert.getDisplayDocument()).toBe('1712345678');
      expect(auditLog.action).toBe('identity_unmask_audit');
      expect(auditLog.guardPersonId).toBe('GRD-501');
    }
  });

  it('should export MusterRoll to CSV and JSON for emergency offline evacuations', () => {
    const musterResult = MusterRoll.create({
      sessionId: 'MUST-SESSION-1' as any,
      siteId: 'SITE-QUITO' as any,
      initiatedBy: 'Guard Chief',
      initiatedAt: new Date('2026-07-23T02:00:00Z'),
      occupants: [
        {
          personId: 'PER-1',
          pseudonym: 'USR-0001',
          fullName: 'Alice Smith',
          zoneId: 'FLOOR-1',
          status: 'present_inside',
        },
        {
          personId: 'PER-2',
          pseudonym: 'USR-0002',
          fullName: 'Bob Jones',
          zoneId: 'FLOOR-2',
          status: 'evacuated_accounted',
        },
      ],
    });

    expect(musterResult.isOk()).toBe(true);
    if (musterResult.isOk()) {
      const muster = musterResult.value;
      expect(muster.getHeadcount()).toEqual({
        totalInside: 2,
        evacuatedCount: 1,
        missingCount: 1,
      });

      const csv = muster.exportToCsv();
      expect(csv).toContain('PersonId,Pseudonym,FullName,ZoneId,Status');
      expect(csv).toContain('PER-1,USR-0001,"Alice Smith",FLOOR-1,present_inside');

      const jsonStr = muster.exportToJson();
      const json = JSON.parse(jsonStr);
      expect(json.sessionId).toBe('MUST-SESSION-1');
      expect(json.headcount.totalInside).toBe(2);
    }
  });
});
