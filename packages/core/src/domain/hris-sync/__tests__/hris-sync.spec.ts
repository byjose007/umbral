import { describe, it, expect } from 'vitest';
import {
  HrisCsvParser,
  HrisReconciler,
  HrisPersonRecord,
} from '../index.js';
import { Person } from '../../identity/person.entity.js';
import { makePersonId, makeEmploymentPeriodId } from '../../identity/ids.js';
import { EmploymentPeriod } from '../../identity/employment-period.entity.js';
import { evaluateAccessStatus } from '../../identity/access-status.js';
import { makeSiteId } from '../../topology/ids.js';

describe('HRIS Sync Domain Suite', () => {
  const siteId = makeSiteId('site-main');

  describe('CSV Parsing', () => {
    it('parses valid HRIS CSV content correctly', () => {
      const csv = `external_ref,national_id,first_name,last_name,email,phone,person_type,site_id,status,start_date,end_date
EMP-001,1712345678,Carlos,Mendoza,carlos@example.com,0991234567,employee,site-main,ACTIVE,2025-01-01,
EMP-002,0912345678,Ana,Torres,ana@example.com,,contractor,site-main,TERMINATED,2024-05-01,2026-07-01`;

      const result = HrisCsvParser.parse(csv);
      expect(result.validRecords.length).toBe(2);
      expect(result.invalidRows.length).toBe(0);

      const rec1 = result.validRecords[0];
      expect(rec1.externalRef).toBe('EMP-001');
      expect(rec1.firstName).toBe('Carlos');
      expect(rec1.status).toBe('ACTIVE');

      const rec2 = result.validRecords[1];
      expect(rec2.externalRef).toBe('EMP-002');
      expect(rec2.isTerminated).toBe(true);
    });

    it('flags malformed CSV rows as invalid', () => {
      const csv = `external_ref,national_id,first_name,last_name
,1712345678,Missing,ExtRef
EMP-999,,Missing,NationalId`;

      const result = HrisCsvParser.parse(csv);
      expect(result.validRecords.length).toBe(0);
      expect(result.invalidRows.length).toBe(2);
    });
  });

  describe('Idempotent Reconciliation & Derived Deprovisioning', () => {
    it('creates new person and active employment period on first import', () => {
      const rec = new HrisPersonRecord({
        externalRef: 'EMP-101',
        nationalId: '1723456789',
        firstName: 'Elena',
        lastName: 'Rios',
        email: 'elena@example.com',
        personType: 'employee',
        siteId: 'site-main',
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
      });

      const { updatedPersons, updatedPeriods, summary } = HrisReconciler.reconcile(
        [rec],
        [],
        []
      );

      expect(summary.createdCount).toBe(1);
      expect(updatedPersons.length).toBe(1);
      expect(updatedPeriods.length).toBe(1);

      const person = updatedPersons[0];
      const period = updatedPeriods[0];

      const accessStatus = evaluateAccessStatus(person, [period], [], []);
      expect(accessStatus.isOk()).toBe(true);
      if (accessStatus.isOk()) {
        expect(accessStatus.value.status).toBe('allowed');
      }
    });

    it('is completely idempotent when re-executed with exact same data', () => {
      const rec = new HrisPersonRecord({
        externalRef: 'EMP-101',
        nationalId: '1723456789',
        firstName: 'Elena',
        lastName: 'Rios',
        email: 'elena@example.com',
        personType: 'employee',
        siteId: 'site-main',
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
      });

      // First run
      const run1 = HrisReconciler.reconcile([rec], [], []);
      expect(run1.summary.createdCount).toBe(1);

      // Second run with same state
      const run2 = HrisReconciler.reconcile([rec], run1.updatedPersons, run1.updatedPeriods);
      expect(run2.summary.createdCount).toBe(0);
      expect(run2.summary.updatedCount).toBe(0);
      expect(run2.summary.unchangedCount).toBe(1);
      expect(run2.updatedPersons.length).toBe(1);
    });

    it('closes employment period upon TERMINATED status and automatically blocks derived access', () => {
      const personId = makePersonId('person-101');
      const person = Person.create({
        id: personId,
        siteId,
        personType: 'employee',
        firstName: 'Elena',
        lastName: 'Rios',
        nationalId: '1723456789',
        externalRef: 'EMP-101',
      })._unsafeUnwrap();

      const activePeriod = EmploymentPeriod.create({
        id: makeEmploymentPeriodId('ep-101'),
        personId,
        contractType: 'full_time',
        validFrom: new Date('2026-01-01'),
        validUntil: null,
      })._unsafeUnwrap();

      // Before HRIS termination import: access is allowed
      const initialStatus = evaluateAccessStatus(person, [activePeriod], [], []);
      expect(initialStatus.isOk()).toBe(true);

      // HRIS sends termination
      const termRec = new HrisPersonRecord({
        externalRef: 'EMP-101',
        nationalId: '1723456789',
        firstName: 'Elena',
        lastName: 'Rios',
        personType: 'employee',
        siteId: 'site-main',
        status: 'TERMINATED',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-07-20'),
      });

      const { updatedPersons, updatedPeriods, summary } = HrisReconciler.reconcile(
        [termRec],
        [person],
        [activePeriod],
        new Date('2026-07-24')
      );

      expect(summary.terminatedCount).toBe(1);
      const closedPeriod = updatedPeriods.find(ep => ep.id === activePeriod.id);
      expect(closedPeriod?.isActiveAt(new Date('2026-07-24'))).toBe(false);

      // Derived access status check: now blocked with NOT_EMPLOYED without touching any admin panel!
      const derivedStatus = evaluateAccessStatus(person, updatedPeriods, [], [], new Date('2026-07-24'));
      expect(derivedStatus.isErr()).toBe(true);
      if (derivedStatus.isErr()) {
        expect(derivedStatus.error.status).toBe('blocked');
        expect(derivedStatus.error.reasonCode).toBe('NOT_EMPLOYED');
      }
    });

    it('reports conflicting identifiers as discrepancies for human review', () => {
      const p1 = Person.create({
        id: makePersonId('p1'),
        siteId,
        personType: 'employee',
        firstName: 'User1',
        lastName: 'Test',
        nationalId: '1111111111',
        externalRef: 'REF-001',
      })._unsafeUnwrap();

      const p2 = Person.create({
        id: makePersonId('p2'),
        siteId,
        personType: 'employee',
        firstName: 'User2',
        lastName: 'Test',
        nationalId: '2222222222',
        externalRef: 'REF-002',
      })._unsafeUnwrap();

      // Conflicting record: externalRef of P1 but nationalId of P2
      const conflictRec = new HrisPersonRecord({
        externalRef: 'REF-001',
        nationalId: '2222222222',
        firstName: 'Conflict',
        lastName: 'User',
        personType: 'employee',
        siteId: 'site-main',
        status: 'ACTIVE',
        startDate: new Date(),
      });

      const { summary } = HrisReconciler.reconcile([conflictRec], [p1, p2], []);
      expect(summary.discrepancies.length).toBe(1);
      expect(summary.discrepancies[0].reason).toContain('Conflict');
    });
  });
});
