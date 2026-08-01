import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  Person,
  EmploymentPeriod,
  Absence,
  PersonDocument,
  evaluateAccessStatus,
  makePersonId,
  makeEmploymentPeriodId,
  makeAbsenceId,
  makeDocumentId,
  makeSiteId,
} from '@umbral/core';
import {
  CreatePersonDto,
  CreateEmploymentPeriodDto,
  CreateAbsenceDto,
  CreatePersonDocumentDto,
} from './dto/identity.dto';
import { v4 as uuidv4 } from './uuid';

import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class IdentityService implements OnModuleInit {
  private readonly personsMap = new Map<string, Person>();
  private readonly employmentPeriodsMap = new Map<string, EmploymentPeriod[]>();
  private readonly absencesMap = new Map<string, Absence[]>();
  private readonly documentsMap = new Map<string, PersonDocument[]>();

  onModuleInit() {
    if (this.personsMap.size > 0) return;

    this.seedPerson({
      id: 'person-demo-001',
      siteId: 'site-default',
      personType: 'employee',
      firstName: 'Byron José',
      lastName: 'López',
      nationalId: '12345678-9',
      email: 'byron@umbral.local',
      externalRef: 'EMP-001',
    });

    this.seedPerson({
      id: 'person-demo-002',
      siteId: 'site-default',
      personType: 'employee',
      firstName: 'María Elena',
      lastName: 'Rodríguez',
      nationalId: '98765432-1',
      email: 'maria@umbral.local',
      externalRef: 'EMP-002',
    });

    this.seedPerson({
      id: 'person-demo-003',
      siteId: 'site-default',
      personType: 'contractor',
      firstName: 'Carlos Eduardo',
      lastName: 'Gómez',
      nationalId: '45678912-3',
      email: 'carlos@proveedor.local',
      externalRef: 'CON-003',
    });
  }

  private seedPerson(input: {
    id: string;
    siteId: string;
    personType: 'employee' | 'contractor' | 'visitor';
    firstName: string;
    lastName: string;
    nationalId: string;
    email: string;
    externalRef: string;
  }) {
    const personRes = Person.create({
      id: makePersonId(input.id),
      siteId: makeSiteId(input.siteId),
      personType: input.personType,
      firstName: input.firstName,
      lastName: input.lastName,
      nationalId: input.nationalId,
      email: input.email,
      externalRef: input.externalRef,
    });
    if (personRes.isErr()) return;
    const person = personRes.value;

    const periodRes = EmploymentPeriod.create({
      id: makeEmploymentPeriodId(uuidv4()),
      personId: person.id,
      contractType: 'full_time',
      validFrom: new Date('2025-01-01'),
      validUntil: null,
      jobTitle: 'Desarrollador Principal',
      department: 'Tecnología',
    });
    const period = periodRes.isOk() ? [periodRes.value] : [];

    this.personsMap.set(person.id, person);
    this.employmentPeriodsMap.set(person.id, period);
    this.absencesMap.set(person.id, []);
    this.documentsMap.set(person.id, []);
  }

  // Person CRUD
  public createPerson(dto: CreatePersonDto) {
    // Unique check per site + nationalId
    for (const p of this.personsMap.values()) {
      if (p.siteId === dto.siteId && p.nationalId === dto.nationalId) {
        throw new BadRequestException(
          `Person with national ID ${dto.nationalId} already exists for this site`,
        );
      }
    }

    const id = makePersonId(uuidv4());
    const res = Person.create({
      id,
      siteId: makeSiteId(dto.siteId),
      personType: dto.personType,
      firstName: dto.firstName,
      lastName: dto.lastName,
      nationalId: dto.nationalId,
      externalRef: dto.externalRef,
      email: dto.email,
      phone: dto.phone,
      photoUrl: dto.photoUrl,
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const person = res.value;
    this.personsMap.set(person.id, person);
    this.employmentPeriodsMap.set(person.id, []);
    this.absencesMap.set(person.id, []);
    this.documentsMap.set(person.id, []);

    return person.props;
  }

  public getPersons(siteId?: string, page = 1, pageSize = 20) {
    let list = Array.from(this.personsMap.values());
    if (siteId) {
      list = list.filter((p) => p.siteId === siteId);
    }

    const total = list.length;
    const start = (page - 1) * pageSize;
    const items = list.slice(start, start + pageSize).map((p) => p.props);

    return { items, total, page, pageSize };
  }

  public getPersonById(id: string) {
    const person = this.personsMap.get(id);
    if (!person) {
      throw new NotFoundException(`Person ${id} not found`);
    }

    const periods = (this.employmentPeriodsMap.get(id) || []).map(
      (p) => p.props,
    );
    const absences = (this.absencesMap.get(id) || []).map((a) => a.props);
    const documents = (this.documentsMap.get(id) || []).map((d) => d.props);

    return {
      ...person.props,
      employmentPeriods: periods,
      absences,
      documents,
    };
  }

  // Employment Periods
  public createEmploymentPeriod(dto: CreateEmploymentPeriodDto) {
    const person = this.personsMap.get(dto.personId);
    if (!person) {
      throw new NotFoundException(`Person ${dto.personId} not found`);
    }

    const validFrom = new Date(dto.validFrom);
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : null;

    const existingPeriods = this.employmentPeriodsMap.get(dto.personId) || [];

    // Overlap check
    for (const ep of existingPeriods) {
      if (ep.overlapsWith(validFrom, validUntil)) {
        throw new BadRequestException(
          'Employment period overlaps with an existing period for this person',
        );
      }
    }

    const id = makeEmploymentPeriodId(uuidv4());
    const res = EmploymentPeriod.create({
      id,
      personId: person.id,
      contractType: dto.contractType,
      validFrom,
      validUntil,
      jobTitle: dto.jobTitle,
      department: dto.department,
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const period = res.value;
    existingPeriods.push(period);
    this.employmentPeriodsMap.set(person.id, existingPeriods);

    return period.props;
  }

  public getEmploymentPeriods(personId: string) {
    const existing = this.employmentPeriodsMap.get(personId);
    if (!existing) {
      throw new NotFoundException(`Person ${personId} not found`);
    }
    return existing.map((p) => p.props);
  }

  // Absences
  public createAbsence(dto: CreateAbsenceDto) {
    const person = this.personsMap.get(dto.personId);
    if (!person) {
      throw new NotFoundException(`Person ${dto.personId} not found`);
    }

    const id = makeAbsenceId(uuidv4());
    const res = Absence.create({
      id,
      personId: person.id,
      absenceType: dto.absenceType,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
      blocksAccess: dto.blocksAccess ?? true,
      reason: dto.reason,
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const absence = res.value;
    const existing = this.absencesMap.get(person.id) || [];
    existing.push(absence);
    this.absencesMap.set(person.id, existing);

    return absence.props;
  }

  public getAbsences(personId: string) {
    const existing = this.absencesMap.get(personId);
    if (!existing) {
      throw new NotFoundException(`Person ${personId} not found`);
    }
    return existing.map((a) => a.props);
  }

  // Person Documents
  public createPersonDocument(dto: CreatePersonDocumentDto) {
    const person = this.personsMap.get(dto.personId);
    if (!person) {
      throw new NotFoundException(`Person ${dto.personId} not found`);
    }

    const id = makeDocumentId(uuidv4());
    const res = PersonDocument.create({
      id,
      personId: person.id,
      docType: dto.docType,
      documentNumber: dto.documentNumber,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      blocksAccessOnExpiry: dto.blocksAccessOnExpiry ?? true,
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const doc = res.value;
    const existing = this.documentsMap.get(person.id) || [];
    existing.push(doc);
    this.documentsMap.set(person.id, existing);

    return doc.props;
  }

  public getPersonDocuments(personId: string) {
    const existing = this.documentsMap.get(personId);
    if (!existing) {
      throw new NotFoundException(`Person ${personId} not found`);
    }
    return existing.map((d) => d.props);
  }

  // Derived Access Status evaluation
  public evaluatePersonAccessStatus(personId: string, atISO?: string) {
    const person = this.personsMap.get(personId);
    if (!person) {
      throw new NotFoundException(`Person ${personId} not found`);
    }

    const periods = this.employmentPeriodsMap.get(personId) || [];
    const absences = this.absencesMap.get(personId) || [];
    const documents = this.documentsMap.get(personId) || [];
    const at = atISO ? new Date(atISO) : new Date();

    const result = evaluateAccessStatus(
      person,
      periods,
      absences,
      documents,
      at,
    );

    if (result.isOk()) {
      return result.value;
    } else {
      return result.error;
    }
  }

  /** Batches access-status evaluation to avoid one HTTP round-trip per person. */
  public evaluateAccessStatusBatch(personIds: string[]) {
    return personIds.map((personId) => {
      if (!this.personsMap.has(personId)) {
        return {
          status: 'blocked' as const,
          personId,
          evaluatedAt: new Date(),
          reasonCode: 'NOT_FOUND',
          message: `Person ${personId} not found`,
        };
      }
      return this.evaluatePersonAccessStatus(personId);
    });
  }
}
