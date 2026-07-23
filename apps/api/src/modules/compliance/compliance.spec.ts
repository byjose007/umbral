import { describe, it, expect, beforeEach } from 'vitest';
import { ComplianceService } from './compliance.service.js';
import { ComplianceController } from './compliance.controller.js';
import { ForbiddenException } from '@nestjs/common';

describe('Compliance Module (API)', () => {
  let service: ComplianceService;
  let controller: ComplianceController;

  beforeEach(() => {
    service = new ComplianceService();
    controller = new ComplianceController(service);
  });

  describe('Retention Policies & Purge', () => {
    it('returns default retention policies', () => {
      const policies = controller.getRetentionPolicies();
      expect(policies.length).toBeGreaterThanOrEqual(4);
      const photoPolicy = policies.find(p => p.dataType === 'visitor_photo');
      expect(photoPolicy?.retentionDays).toBe(30);
    });

    it('executes purge job on registered items', () => {
      service.registerPurgeableItem({
        id: 'photo-expired-1',
        dataType: 'visitor_photo',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      });

      const summaries = controller.executePurge({ dataType: 'visitor_photo' });
      expect(summaries.length).toBe(1);
      expect(summaries[0].purgedCount).toBe(1);
      expect(summaries[0].purgedIds).toContain('photo-expired-1');
    });
  });

  describe('PII Access Audit', () => {
    it('records PII access and logs disclosure', () => {
      const log = controller.recordPiiAccess({
        operatorId: 'op-supervisor',
        operatorRoles: ['security_supervisor'],
        targetPersonId: 'person-demo-1',
        accessType: 'TRAJECTORY_QUERY',
        justification: 'Audit review',
      });

      expect(log.operatorId).toBe('op-supervisor');

      const logs = controller.queryPiiAuditLogs({ targetPersonId: 'person-demo-1' });
      expect(logs.length).toBe(1);
      expect(logs[0].justification).toBe('Audit review');
    });

    it('denies garita operator from trajectory queries without permission', () => {
      expect(() => {
        controller.recordPiiAccess({
          operatorId: 'op-garita-1',
          operatorRoles: ['garita_operator'],
          targetPersonId: 'person-demo-1',
          accessType: 'TRAJECTORY_QUERY',
          justification: 'Curiosity',
        });
      }).toThrow(ForbiddenException);
    });
  });

  describe('ARCO Rights Execution', () => {
    it('exports person data with checksum', () => {
      const result = controller.exportPersonData('person-demo-1', {
        operatorId: 'op-compliance-1',
        operatorRoles: ['compliance_officer'],
        justification: 'ARCO Access Request',
      });

      expect(result.bundle.personId).toBe('person-demo-1');
      expect(result.bundle.personalInfo.firstName).toBe('Carlos');
      expect(result.bundle.checksum).toContain('SHA256:');
      expect(result.auditLog.accessType).toBe('ARCO_EXPORT');
    });

    it('anonymizes person record while leaving hash chain intact', () => {
      const result = controller.anonymizePersonData('person-demo-1', {
        operatorId: 'op-compliance-1',
        operatorRoles: ['compliance_officer'],
        justification: 'ARCO Deletion Request',
      });

      expect(result.result.hashChainIntact).toBe(true);
      expect(result.auditLog.accessType).toBe('ARCO_ANONYMIZE');
    });
  });

  describe('Privacy Notices & Consent', () => {
    it('creates and fetches privacy notices and records consent', () => {
      const notice = controller.createPrivacyNotice({
        targetAudience: 'EMPLOYEE',
        version: '1.0.0',
        title: 'Aviso de Privacidad Empleados',
        content: 'Tratamiento de datos personales en el ambiente laboral...',
        lawfulBasis: 'EMPLOYMENT_CONTRACT',
      });

      expect(notice.version).toBe('1.0.0');

      const consent = controller.recordPrivacyConsent({
        personId: 'emp-100',
        noticeId: notice.id,
        noticeVersion: '1.0.0',
        lawfulBasis: 'EMPLOYMENT_CONTRACT',
      });

      expect(consent.personId).toBe('emp-100');
    });
  });
});
