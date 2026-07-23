import { describe, it, expect } from 'vitest';
import {
  RetentionPolicy,
  makeRetentionPolicyId,
  PiiAccessAuditLog,
  makePiiAuditLogId,
  ArcoService,
  PrivacyNotice,
  makePrivacyNoticeId,
  PrivacyConsent,
  makePrivacyConsentId,
  UnauthorizedPiiAccessError,
} from '../index.js';
import { Person } from '../../identity/person.entity.js';
import { makePersonId } from '../../identity/ids.js';
import { AccessEvent } from '../../events-audit/access-event.entity.js';
import { computeEventHash, GENESIS_HASH } from '../../events-audit/hash-chain.js';
import { makeAccessEventId } from '../../events-audit/ids.js';
import { makeSiteId, makeDoorId } from '../../topology/ids.js';

describe('Compliance Domain Suite', () => {
  describe('Retention Policy & Data Purging', () => {
    it('calculates correct cutoff date and executes purge on expired visitor photos', () => {
      const policyId = makeRetentionPolicyId('ret-photo-1');
      const policyRes = RetentionPolicy.create({
        id: policyId,
        dataType: 'visitor_photo',
        retentionDays: 30,
        autoPurgeEnabled: true,
        updatedAt: new Date('2026-07-01T00:00:00Z'),
      });

      expect(policyRes.isOk()).toBe(true);
      const policy = policyRes._unsafeUnwrap();

      const now = new Date('2026-07-23T00:00:00Z');
      const cutoff = policy.calculateCutoffDate(now);
      expect(cutoff.toISOString()).toBe('2026-06-23T00:00:00.000Z');

      const items = [
        { id: 'photo-old', dataType: 'visitor_photo' as const, createdAt: new Date('2026-05-15T00:00:00Z') },
        { id: 'photo-recent', dataType: 'visitor_photo' as const, createdAt: new Date('2026-07-10T00:00:00Z') },
      ];

      const purgeSummary = policy.executePurge(items, now);
      expect(purgeSummary.purgedCount).toBe(1);
      expect(purgeSummary.remainingCount).toBe(1);
      expect(purgeSummary.purgedIds).toEqual(['photo-old']);
    });
  });

  describe('PII Access Audit & Segregation', () => {
    it('creates PII access log with mandatory justification', () => {
      const auditId = makePiiAuditLogId('pii-log-1');
      const auditRes = PiiAccessAuditLog.create({
        id: auditId,
        operatorId: 'op-123',
        targetPersonId: 'person-456',
        accessType: 'IDENTITY_REVEAL',
        justification: 'Security incident investigation #892',
        timestamp: new Date(),
      });

      expect(auditRes.isOk()).toBe(true);
      const log = auditRes._unsafeUnwrap();
      expect(log.operatorId).toBe('op-123');
      expect(log.justification).toBe('Security incident investigation #892');
    });

    it('denies garita operator without tracking permissions from accessing trajectories', () => {
      const authRes = PiiAccessAuditLog.authorizeAccess(
        'op-garita',
        ['garita_operator'],
        'TRAJECTORY_QUERY',
        'person-123'
      );

      expect(authRes.isErr()).toBe(true);
      expect(authRes.error).toBeInstanceOf(UnauthorizedPiiAccessError);
    });

    it('allows compliance officer or admin to perform PII queries', () => {
      const authRes = PiiAccessAuditLog.authorizeAccess(
        'op-officer',
        ['compliance_officer'],
        'TRAJECTORY_QUERY',
        'person-123'
      );

      expect(authRes.isOk()).toBe(true);
      expect(authRes.value).toBe(true);
    });
  });

  describe('ARCO Rights & Audit Log Hash Chain Integrity', () => {
    it('exports personal data bundle with checksum and PII audit record', () => {
      const siteId = makeSiteId('site-1');
      const personId = makePersonId('person-arco-1');
      const personRes = Person.create({
        id: personId,
        siteId,
        personType: 'employee',
        firstName: 'Maria',
        lastName: 'Lopez',
        nationalId: '1723456789',
        email: 'maria.lopez@example.com',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      });
      expect(personRes.isOk()).toBe(true);
      const person = personRes._unsafeUnwrap();

      const exportRes = ArcoService.exportData(
        person,
        [],
        [{ noticeId: 'notice-1', acceptedAt: new Date() }],
        'op-admin',
        'Subject Access Request SAR-001'
      );

      expect(exportRes.isOk()).toBe(true);
      const { bundle, auditLog } = exportRes._unsafeUnwrap();
      expect(bundle.personId).toBe(personId);
      expect(bundle.personalInfo.firstName).toBe('Maria');
      expect(auditLog.accessType).toBe('ARCO_EXPORT');
    });

    it('anonymizes person details without breaking AccessEvent hash chain verification', () => {
      const siteId = makeSiteId('site-1');
      const personId = makePersonId('person-arco-2');
      const personRes = Person.create({
        id: personId,
        siteId,
        personType: 'visitor',
        firstName: 'Juan',
        lastName: 'Perez',
        nationalId: '0912345678',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(personRes.isOk()).toBe(true);
      const person = personRes._unsafeUnwrap();

      const doorId = makeDoorId('door-1');
      const eventId = makeAccessEventId('evt-1');
      const ts = new Date('2026-07-20T10:00:00Z');
      const payloadStr = JSON.stringify({});
      const currentHash = computeEventHash(GENESIS_HASH, eventId, ts.toISOString(), 'access.granted', payloadStr);

      const eventRes = AccessEvent.create({
        id: eventId,
        chainPartition: 'site-1',
        sequenceNumber: 1,
        previousHash: GENESIS_HASH,
        currentHash,
        eventType: 'access.granted',
        siteId,
        doorId,
        personId,
        timestamp: ts,
      });

      const event = eventRes._unsafeUnwrap();
      expect(event.verifyHash()).toBe(true);

      const anonRes = ArcoService.anonymizeData(
        person,
        [event],
        'op-compliance',
        'ARCO Deletion Request DEL-999'
      );

      expect(anonRes.isOk()).toBe(true);
      const { result, auditLog } = anonRes._unsafeUnwrap();
      expect(result.hashChainIntact).toBe(true);
      expect(auditLog.accessType).toBe('ARCO_ANONYMIZE');
    });
  });

  describe('Lawful Basis & Privacy Notices', () => {
    it('creates active privacy notice and records visitor consent', () => {
      const noticeId = makePrivacyNoticeId('notice-v1');
      const noticeRes = PrivacyNotice.create({
        id: noticeId,
        targetAudience: 'VISITOR',
        version: '1.0.0',
        title: 'Aviso de Privacidad de Control de Acceso UMBRAL',
        content: 'En conformidad con la LOPDP, los datos de acceso se tratarán...',
        lawfulBasis: 'CONSENT',
        active: true,
        effectiveDate: new Date('2026-01-01T00:00:00Z'),
      });

      expect(noticeRes.isOk()).toBe(true);
      const notice = noticeRes._unsafeUnwrap();
      expect(notice.lawfulBasis).toBe('CONSENT');

      const consentId = makePrivacyConsentId('consent-1');
      const consentRes = PrivacyConsent.record({
        id: consentId,
        personId: 'visitor-789',
        noticeId,
        noticeVersion: '1.0.0',
        lawfulBasis: 'CONSENT',
        acceptedAt: new Date(),
        ipAddress: '192.168.1.100',
      });

      expect(consentRes.isOk()).toBe(true);
      const consent = consentRes._unsafeUnwrap();
      expect(consent.personId).toBe('visitor-789');
      expect(consent.noticeId).toBe(noticeId);
    });
  });
});
