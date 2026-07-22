import { ok, err, Result } from 'neverthrow';
import { Person } from './person.entity.js';
import { EmploymentPeriod } from './employment-period.entity.js';
import { Absence } from './absence.entity.js';
import { PersonDocument } from './person-document.entity.js';
import { EmploymentPeriodId, PersonId } from './ids.js';

export type BlockReasonCode =
  | 'NOT_EMPLOYED'
  | 'ABSENCE_ACTIVE'
  | 'DOCUMENT_EXPIRED'
  | 'NO_ACTIVE_CREDENTIAL';

export interface AllowedAccessStatus {
  readonly status: 'allowed';
  readonly personId: PersonId;
  readonly evaluatedAt: Date;
  readonly activeEmploymentId: EmploymentPeriodId;
}

export interface BlockedAccessReason {
  readonly status: 'blocked';
  readonly personId: PersonId;
  readonly evaluatedAt: Date;
  readonly reasonCode: BlockReasonCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export type AccessStatus = AllowedAccessStatus | BlockedAccessReason;

export function evaluateAccessStatus(
  person: Person,
  periods: readonly EmploymentPeriod[],
  absences: readonly Absence[],
  documents: readonly PersonDocument[],
  at: Date = new Date()
): Result<AllowedAccessStatus, BlockedAccessReason> {
  // 1. Employment period check
  const activePeriod = periods.find((p) => p.isActiveAt(at));
  if (!activePeriod) {
    return err({
      status: 'blocked',
      personId: person.id,
      evaluatedAt: at,
      reasonCode: 'NOT_EMPLOYED',
      message: 'Person does not have an active employment period at the evaluated time',
    });
  }

  // 2. Absence check
  const activeBlockingAbsence = absences.find((a) => a.isBlockingAt(at));
  if (activeBlockingAbsence) {
    return err({
      status: 'blocked',
      personId: person.id,
      evaluatedAt: at,
      reasonCode: 'ABSENCE_ACTIVE',
      message: `Access blocked due to active absence: ${activeBlockingAbsence.absenceType}`,
      details: {
        absenceId: activeBlockingAbsence.id,
        absenceType: activeBlockingAbsence.absenceType,
        validUntil: activeBlockingAbsence.validUntil,
      },
    });
  }

  // 3. Document expiration check
  const expiredBlockingDoc = documents.find((d) => d.isBlockingAt(at));
  if (expiredBlockingDoc) {
    return err({
      status: 'blocked',
      personId: person.id,
      evaluatedAt: at,
      reasonCode: 'DOCUMENT_EXPIRED',
      message: `Access blocked due to expired document: ${expiredBlockingDoc.docType}`,
      details: {
        documentId: expiredBlockingDoc.id,
        docType: expiredBlockingDoc.docType,
        expiresAt: expiredBlockingDoc.expiresAt,
      },
    });
  }

  return ok({
    status: 'allowed',
    personId: person.id,
    evaluatedAt: at,
    activeEmploymentId: activePeriod.id,
  });
}
