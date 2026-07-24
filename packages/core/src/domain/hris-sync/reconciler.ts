import { HrisPersonRecord } from './hris-record.vo.js';
import { Person } from '../identity/person.entity.js';
import { EmploymentPeriod, ContractType } from '../identity/employment-period.entity.js';
import { makePersonId, makeEmploymentPeriodId } from '../identity/ids.js';
import { makeSiteId } from '../topology/ids.js';
import { HrisDiscrepancyId, makeHrisDiscrepancyId } from './ids.js';

export interface HrisDiscrepancy {
  readonly id: HrisDiscrepancyId;
  readonly externalRef: string;
  readonly nationalId?: string;
  readonly reason: string;
  readonly rawData: Record<string, unknown>;
  readonly detectedAt: Date;
}

export interface ReconciliationSummary {
  readonly totalProcessed: number;
  readonly createdCount: number;
  readonly updatedCount: number;
  readonly terminatedCount: number;
  readonly unchangedCount: number;
  readonly discrepancies: HrisDiscrepancy[];
}

export class HrisReconciler {
  /**
   * Perform idempotent reconciliation of HRIS records against current Person and EmploymentPeriod state.
   */
  public static reconcile(
    records: HrisPersonRecord[],
    existingPersons: Person[],
    existingEmploymentPeriods: EmploymentPeriod[],
    at: Date = new Date()
  ): {
    updatedPersons: Person[];
    updatedPeriods: EmploymentPeriod[];
    summary: ReconciliationSummary;
  } {
    const personMapByExtRef = new Map<string, Person>();
    const personMapByNationalId = new Map<string, Person>();

    for (const p of existingPersons) {
      if (p.externalRef) {
        personMapByExtRef.set(p.externalRef, p);
      }
      if (p.nationalId) {
        personMapByNationalId.set(p.nationalId, p);
      }
    }

    const resultPersons = new Map<string, Person>();
    for (const p of existingPersons) {
      resultPersons.set(p.id, p);
    }

    const resultPeriods = new Map<string, EmploymentPeriod>();
    for (const ep of existingEmploymentPeriods) {
      resultPeriods.set(ep.id, ep);
    }

    let createdCount = 0;
    let updatedCount = 0;
    let terminatedCount = 0;
    let unchangedCount = 0;
    const discrepancies: HrisDiscrepancy[] = [];

    for (const record of records) {
      const matchedByExt = personMapByExtRef.get(record.externalRef);
      const matchedByNat = personMapByNationalId.get(record.nationalId);

      // Check conflict: matchedByExt and matchedByNat point to different person IDs
      if (matchedByExt && matchedByNat && matchedByExt.id !== matchedByNat.id) {
        discrepancies.push({
          id: makeHrisDiscrepancyId(`disc-${record.externalRef}-${Date.now()}`),
          externalRef: record.externalRef,
          nationalId: record.nationalId,
          reason: `Conflict: external_ref '${record.externalRef}' matches person ${matchedByExt.id}, but national_id '${record.nationalId}' matches person ${matchedByNat.id}`,
          rawData: { ...record.props },
          detectedAt: new Date(),
        });
        continue;
      }

      const existingPerson = matchedByExt ?? matchedByNat;
      const contractType: ContractType = record.personType === 'contractor' ? 'contractor' : 'full_time';

      if (!existingPerson) {
        // --- CREATE NEW PERSON ---
        const newPersonId = makePersonId(`person-hris-${record.externalRef}`);
        const pRes = Person.create({
          id: newPersonId,
          siteId: makeSiteId(record.siteId),
          personType: record.personType,
          firstName: record.firstName,
          lastName: record.lastName,
          nationalId: record.nationalId,
          externalRef: record.externalRef,
          email: record.email,
          phone: record.phone,
        });

        if (pRes.isOk()) {
          resultPersons.set(newPersonId, pRes.value);
          personMapByExtRef.set(record.externalRef, pRes.value);
          personMapByNationalId.set(record.nationalId, pRes.value);

          if (record.isTerminated) {
            const epRes = EmploymentPeriod.create({
              id: makeEmploymentPeriodId(`ep-${record.externalRef}-1`),
              personId: newPersonId,
              contractType,
              validFrom: record.startDate,
              validUntil: record.endDate ?? at,
            });
            if (epRes.isOk()) {
              resultPeriods.set(epRes.value.id, epRes.value);
            }
            terminatedCount++;
          } else {
            const epRes = EmploymentPeriod.create({
              id: makeEmploymentPeriodId(`ep-${record.externalRef}-1`),
              personId: newPersonId,
              contractType,
              validFrom: record.startDate,
              validUntil: null,
            });
            if (epRes.isOk()) {
              resultPeriods.set(epRes.value.id, epRes.value);
            }
            createdCount++;
          }
        }
      } else {
        // --- RECONCILE EXISTING PERSON ---
        const personId = existingPerson.id;

        // Check if person properties changed
        const isNameChanged = existingPerson.firstName !== record.firstName || existingPerson.lastName !== record.lastName;
        const isEmailChanged = existingPerson.email !== record.email;
        const isExtRefMissing = !existingPerson.externalRef;

        let currentPerson = existingPerson;
        if (isNameChanged || isEmailChanged || isExtRefMissing) {
          const uRes = Person.create({
            id: personId,
            siteId: existingPerson.siteId,
            personType: record.personType,
            firstName: record.firstName,
            lastName: record.lastName,
            nationalId: existingPerson.nationalId,
            externalRef: record.externalRef,
            email: record.email ?? existingPerson.email,
            phone: record.phone ?? existingPerson.phone,
          });
          if (uRes.isOk()) {
            currentPerson = uRes.value;
            resultPersons.set(personId, currentPerson);
            updatedCount++;
          }
        }

        // Reconcile Employment Period
        const personPeriods = Array.from(resultPeriods.values()).filter(ep => ep.personId === personId);
        const activePeriod = personPeriods.find(ep => ep.isActiveAt(at));

        if (record.isTerminated) {
          // TERMINATION: Close active employment period if open
          if (activePeriod) {
            const terminationDate = record.endDate ?? at;
            const closedEpRes = EmploymentPeriod.create({
              id: activePeriod.id,
              personId: activePeriod.personId,
              contractType: activePeriod.contractType,
              validFrom: activePeriod.validFrom,
              validUntil: terminationDate,
            });
            if (closedEpRes.isOk()) {
              resultPeriods.set(activePeriod.id, closedEpRes.value);
              terminatedCount++;
            }
          } else {
            unchangedCount++;
          }
        } else {
          // ACTIVE: Ensure an active employment period exists
          if (!activePeriod) {
            const newEpRes = EmploymentPeriod.create({
              id: makeEmploymentPeriodId(`ep-${record.externalRef}-${personPeriods.length + 1}`),
              personId,
              contractType,
              validFrom: record.startDate,
              validUntil: null,
            });
            if (newEpRes.isOk()) {
              resultPeriods.set(newEpRes.value.id, newEpRes.value);
              updatedCount++;
            }
          } else {
            unchangedCount++;
          }
        }
      }
    }

    return {
      updatedPersons: Array.from(resultPersons.values()),
      updatedPeriods: Array.from(resultPeriods.values()),
      summary: {
        totalProcessed: records.length,
        createdCount,
        updatedCount,
        terminatedCount,
        unchangedCount,
        discrepancies,
      },
    };
  }
}
