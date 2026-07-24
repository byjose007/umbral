import { describe, it, expect, beforeEach } from 'vitest';
import { HrisSyncService } from './hris-sync.service.js';
import { HrisSyncController } from './hris-sync.controller.js';

describe('HRIS Sync Module (API)', () => {
  let service: HrisSyncService;
  let controller: HrisSyncController;

  beforeEach(() => {
    service = new HrisSyncService();
    controller = new HrisSyncController(service);
  });

  describe('CSV Import & Watcher Execution', () => {
    it('imports new personnel from CSV and updates identity state', () => {
      const csv = `external_ref,national_id,first_name,last_name,email,person_type,site_id,status,start_date
EMP-100,1788776655,Veronica,Salazar,veronica@example.com,employee,site-main,ACTIVE,2026-01-01`;

      const batch = controller.importCsv({ csvContent: csv });
      expect(batch.summary.createdCount).toBe(1);

      const persons = controller.getPersons();
      const veronica = persons.find((p) => p.externalRef === 'EMP-100');
      expect(veronica).toBeDefined();
      expect(veronica?.firstName).toBe('Veronica');
    });

    it('triggers batch execution from folder watcher', () => {
      const batch = controller.triggerBatch({
        sourceName: 'hris-drop-folder.csv',
      });
      expect(batch.filename).toBe('hris-drop-folder.csv');
      expect(batch.summary.totalProcessed).toBe(2);
    });

    it('configures directory watcher settings', () => {
      const config = controller.configureWatcher({
        folderPath: '/mnt/hris/watcher',
        pollIntervalMinutes: 30,
        autoProcess: true,
      });

      expect(config.status).toBe('CONFIGURED');
      expect(config.config.folderPath).toBe('/mnt/hris/watcher');
    });
  });

  describe('Termination & Automatic Deprovisioning Integration', () => {
    it('processes termination from CSV and closes employment period', () => {
      const termCsv = `external_ref,national_id,first_name,last_name,email,person_type,site_id,status,start_date,end_date
EMP-001,1712345678,Carlos,Mendoza,carlos@example.com,employee,site-main,TERMINATED,2025-01-01,2026-07-20`;

      const batch = controller.importCsv({ csvContent: termCsv });
      expect(batch.summary.terminatedCount).toBe(1);

      const periods = service.getEmploymentPeriods();
      const carlosPeriod = periods.find(
        (ep) => ep.personId === 'person-hris-EMP-001',
      );
      expect(carlosPeriod?.validUntil).not.toBeNull();
    });
  });
});
