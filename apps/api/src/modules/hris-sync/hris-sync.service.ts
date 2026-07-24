import { Injectable, BadRequestException } from '@nestjs/common';
import {
  HrisCsvParser,
  HrisReconciler,
  HrisPersonRecord,
  HrisDiscrepancy,
  ReconciliationSummary,
  Person,
  EmploymentPeriod,
  makePersonId,
  makeEmploymentPeriodId,
  makeSiteId,
} from '@umbral/core';
import { ImportCsvDto, ConfigureWatcherDto } from './dto/hris-sync.dto.js';

export interface HrisImportBatchRecord {
  readonly id: string;
  readonly filename?: string;
  readonly importedAt: Date;
  readonly summary: ReconciliationSummary;
}

@Injectable()
export class HrisSyncService {
  private existingPersons: Person[] = [];
  private existingEmploymentPeriods: EmploymentPeriod[] = [];
  private discrepancies: HrisDiscrepancy[] = [];
  private importBatches: HrisImportBatchRecord[] = [];
  private watcherConfig = {
    folderPath: '/var/spool/umbral/hris-import',
    pollIntervalMinutes: 15,
    autoProcess: true,
  };

  constructor() {
    this.seedMockIdentityState();
  }

  private seedMockIdentityState() {
    const siteId = makeSiteId('site-main');
    const p1Id = makePersonId('person-hris-EMP-001');
    const p1Res = Person.create({
      id: p1Id,
      siteId,
      personType: 'employee',
      firstName: 'Carlos',
      lastName: 'Mendoza',
      nationalId: '1712345678',
      externalRef: 'EMP-001',
      email: 'carlos@example.com',
    });
    if (p1Res.isOk()) {
      this.existingPersons.push(p1Res.value);

      const ep1Res = EmploymentPeriod.create({
        id: makeEmploymentPeriodId('ep-EMP-001-1'),
        personId: p1Id,
        contractType: 'full_time',
        validFrom: new Date('2025-01-01'),
        validUntil: null,
      });
      if (ep1Res.isOk()) {
        this.existingEmploymentPeriods.push(ep1Res.value);
      }
    }
  }

  public importCsv(
    dto: ImportCsvDto,
    filename: string = 'manual-upload.csv',
  ): HrisImportBatchRecord {
    if (!dto.csvContent || dto.csvContent.trim().length === 0) {
      throw new BadRequestException('CSV content cannot be empty');
    }

    const parseResult = HrisCsvParser.parse(dto.csvContent);

    const reconcileResult = HrisReconciler.reconcile(
      parseResult.validRecords,
      this.existingPersons,
      this.existingEmploymentPeriods,
    );

    // Update in-memory state
    this.existingPersons = reconcileResult.updatedPersons;
    this.existingEmploymentPeriods = reconcileResult.updatedPeriods;

    if (reconcileResult.summary.discrepancies.length > 0) {
      this.discrepancies.push(...reconcileResult.summary.discrepancies);
    }

    const batch: HrisImportBatchRecord = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      filename,
      importedAt: new Date(),
      summary: reconcileResult.summary,
    };

    this.importBatches.push(batch);
    return batch;
  }

  public configureWatcher(dto: ConfigureWatcherDto) {
    this.watcherConfig = {
      folderPath: dto.folderPath,
      pollIntervalMinutes: dto.pollIntervalMinutes ?? 15,
      autoProcess: dto.autoProcess ?? true,
    };
    return { status: 'CONFIGURED', config: this.watcherConfig };
  }

  public getWatcherConfig() {
    return this.watcherConfig;
  }

  public getDiscrepancies(): HrisDiscrepancy[] {
    return this.discrepancies;
  }

  public getImportBatches(): HrisImportBatchRecord[] {
    return this.importBatches;
  }

  public getPersons(): Person[] {
    return this.existingPersons;
  }

  public getEmploymentPeriods(): EmploymentPeriod[] {
    return this.existingEmploymentPeriods;
  }
}
