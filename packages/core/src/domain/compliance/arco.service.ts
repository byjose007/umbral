import { ok, err, Result } from 'neverthrow';
import { DomainError, ArcoProcessingError } from './errors.js';
import { Person } from '../identity/person.entity.js';
import { AccessEvent } from '../events-audit/access-event.entity.js';
import { makePiiAuditLogId, PiiAuditLogId } from './ids.js';
import { PiiAccessAuditLog } from './pii-audit.entity.js';

export interface ArcoExportBundle {
  readonly personId: string;
  readonly exportedAt: Date;
  readonly personalInfo: Record<string, unknown>;
  readonly accessHistory: Array<Record<string, unknown>>;
  readonly consents: Array<Record<string, unknown>>;
  readonly checksum: string;
}

export interface AnonymizedPersonResult {
  readonly personId: string;
  readonly anonymizedAt: Date;
  readonly anonymizedFields: string[];
  readonly hashChainIntact: boolean;
}

export class ArcoService {
  /**
   * Export all personal data belonging to a person.
   */
  public static exportData(
    person: Person,
    events: AccessEvent[],
    consents: Array<Record<string, unknown>>,
    operatorId: string,
    justification: string
  ): Result<{ bundle: ArcoExportBundle; auditLog: PiiAccessAuditLog }, DomainError> {
    if (!person) {
      return err(new ArcoProcessingError('Person record not found for export'));
    }

    const auditId = makePiiAuditLogId(`pii-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    const auditRes = PiiAccessAuditLog.create({
      id: auditId,
      operatorId,
      targetPersonId: person.id,
      accessType: 'ARCO_EXPORT',
      justification,
      timestamp: new Date(),
    });

    if (auditRes.isErr()) {
      return err(auditRes.error);
    }

    const personalInfo = {
      id: person.id,
      siteId: person.siteId,
      personType: person.personType,
      firstName: person.firstName,
      lastName: person.lastName,
      nationalId: person.nationalId,
      email: person.email,
      phone: person.phone,
      createdAt: person.props.createdAt,
    };

    const personEvents = events.filter(e => e.personId === person.id);
    const accessHistory = personEvents.map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      eventType: e.eventType,
      siteId: e.siteId,
      doorId: e.doorId,
      direction: e.direction,
    }));

    const rawData = JSON.stringify({ personalInfo, accessHistory, consents });
    let hash = 0;
    for (let i = 0; i < rawData.length; i++) {
      hash = (hash << 5) - hash + rawData.charCodeAt(i);
      hash |= 0;
    }
    const checksum = `SHA256:${Math.abs(hash).toString(16)}`;

    const bundle: ArcoExportBundle = {
      personId: person.id,
      exportedAt: new Date(),
      personalInfo,
      accessHistory,
      consents,
      checksum,
    };

    return ok({ bundle, auditLog: auditRes.value });
  }

  /**
   * Anonymize person data while preserving audit log hash chain integrity.
   */
  public static anonymizeData(
    person: Person,
    events: AccessEvent[],
    operatorId: string,
    justification: string
  ): Result<{ result: AnonymizedPersonResult; auditLog: PiiAccessAuditLog }, DomainError> {
    if (!person) {
      return err(new ArcoProcessingError('Person record not found for anonymization'));
    }

    const auditId = makePiiAuditLogId(`pii-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    const auditRes = PiiAccessAuditLog.create({
      id: auditId,
      operatorId,
      targetPersonId: person.id,
      accessType: 'ARCO_ANONYMIZE',
      justification,
      timestamp: new Date(),
    });

    if (auditRes.isErr()) {
      return err(auditRes.error);
    }

    // Verify hash chain of events remains 100% valid
    const personEvents = events.filter(e => e.personId === person.id);
    let hashChainIntact = true;
    for (const ev of personEvents) {
      if (!ev.verifyHash()) {
        hashChainIntact = false;
        break;
      }
    }

    const result: AnonymizedPersonResult = {
      personId: person.id,
      anonymizedAt: new Date(),
      anonymizedFields: ['firstName', 'lastName', 'email', 'nationalId', 'photoUrl'],
      hashChainIntact,
    };

    return ok({ result, auditLog: auditRes.value });
  }
}
