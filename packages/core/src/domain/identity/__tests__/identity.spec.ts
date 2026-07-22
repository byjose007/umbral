import { describe, it, expect } from 'vitest';
import { Person } from '../person.entity.js';
import { EmploymentPeriod } from '../employment-period.entity.js';
import { Absence } from '../absence.entity.js';
import { PersonDocument } from '../person-document.entity.js';
import { evaluateAccessStatus } from '../access-status.js';
import { makePersonId, makeEmploymentPeriodId, makeAbsenceId, makeDocumentId } from '../ids.js';
import { makeSiteId } from '../../topology/ids.js';

describe('Identity Domain', () => {
  const siteId = makeSiteId('site-01');
  const personId = makePersonId('person-01');

  it('creates a Person entity correctly', () => {
    const res = Person.create({
      id: personId,
      siteId,
      personType: 'employee',
      firstName: 'Juan',
      lastName: 'Pérez',
      nationalId: '0987654321',
      externalRef: 'HR-101',
    });

    expect(res.isOk()).toBe(true);
    if (res.isOk()) {
      expect(res.value.fullName).toBe('Juan Pérez');
      expect(res.value.externalRef).toBe('HR-101');
    }
  });

  it('detects employment period overlaps', () => {
    const p1 = EmploymentPeriod.create({
      id: makeEmploymentPeriodId('ep-1'),
      personId,
      contractType: 'full_time',
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-06-30'),
    })._unsafeUnwrap();

    // Overlapping period
    expect(p1.overlapsWith(new Date('2026-05-01'), new Date('2026-12-31'))).toBe(true);
    // Non-overlapping period
    expect(p1.overlapsWith(new Date('2026-07-01'), new Date('2026-12-31'))).toBe(false);
  });

  it('evaluates access status as ALLOWED when active employment, no absence, no expired docs', () => {
    const person = Person.create({
      id: personId,
      siteId,
      personType: 'employee',
      firstName: 'Maria',
      lastName: 'Gómez',
      nationalId: '1712345678',
    })._unsafeUnwrap();

    const period = EmploymentPeriod.create({
      id: makeEmploymentPeriodId('ep-1'),
      personId,
      contractType: 'full_time',
      validFrom: new Date('2026-01-01'),
    })._unsafeUnwrap();

    const evalDate = new Date('2026-07-15');
    const result = evaluateAccessStatus(person, [period], [], [], evalDate);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.status).toBe('allowed');
      expect(result.value.activeEmploymentId).toBe(period.id);
    }
  });

  it('evaluates access status as BLOCKED (NOT_EMPLOYED) when no active employment', () => {
    const person = Person.create({
      id: personId,
      siteId,
      personType: 'employee',
      firstName: 'Maria',
      lastName: 'Gómez',
      nationalId: '1712345678',
    })._unsafeUnwrap();

    const pastPeriod = EmploymentPeriod.create({
      id: makeEmploymentPeriodId('ep-1'),
      personId,
      contractType: 'full_time',
      validFrom: new Date('2025-01-01'),
      validUntil: new Date('2025-12-31'),
    })._unsafeUnwrap();

    const evalDate = new Date('2026-07-15');
    const result = evaluateAccessStatus(person, [pastPeriod], [], [], evalDate);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.reasonCode).toBe('NOT_EMPLOYED');
    }
  });

  it('evaluates access status as BLOCKED (ABSENCE_ACTIVE) during blocking absence', () => {
    const person = Person.create({
      id: personId,
      siteId,
      personType: 'employee',
      firstName: 'Maria',
      lastName: 'Gómez',
      nationalId: '1712345678',
    })._unsafeUnwrap();

    const period = EmploymentPeriod.create({
      id: makeEmploymentPeriodId('ep-1'),
      personId,
      contractType: 'full_time',
      validFrom: new Date('2026-01-01'),
    })._unsafeUnwrap();

    const vacation = Absence.create({
      id: makeAbsenceId('abs-1'),
      personId,
      absenceType: 'vacation',
      validFrom: new Date('2026-07-10'),
      validUntil: new Date('2026-07-20'),
      blocksAccess: true,
    })._unsafeUnwrap();

    const evalDateDuringVacation = new Date('2026-07-15');
    const res1 = evaluateAccessStatus(person, [period], [vacation], [], evalDateDuringVacation);
    expect(res1.isErr()).toBe(true);
    if (res1.isErr()) {
      expect(res1.error.reasonCode).toBe('ABSENCE_ACTIVE');
    }

    // Automatic reactivation after vacation ends
    const evalDateAfterVacation = new Date('2026-07-21');
    const res2 = evaluateAccessStatus(person, [period], [vacation], [], evalDateAfterVacation);
    expect(res2.isOk()).toBe(true);
  });

  it('evaluates access status as BLOCKED (DOCUMENT_EXPIRED) when required doc is expired', () => {
    const person = Person.create({
      id: personId,
      siteId,
      personType: 'contractor',
      firstName: 'Carlos',
      lastName: 'Ruiz',
      nationalId: '0911223344',
    })._unsafeUnwrap();

    const period = EmploymentPeriod.create({
      id: makeEmploymentPeriodId('ep-1'),
      personId,
      contractType: 'contractor',
      validFrom: new Date('2026-01-01'),
    })._unsafeUnwrap();

    const expiredCert = PersonDocument.create({
      id: makeDocumentId('doc-1'),
      personId,
      docType: 'safety_cert',
      documentNumber: 'CERT-999',
      expiresAt: new Date('2026-06-30'),
      blocksAccessOnExpiry: true,
    })._unsafeUnwrap();

    const evalDate = new Date('2026-07-15');
    const res = evaluateAccessStatus(person, [period], [], [expiredCert], evalDate);

    expect(res.isErr()).toBe(true);
    if (res.isErr()) {
      expect(res.error.reasonCode).toBe('DOCUMENT_EXPIRED');
    }
  });
});
