import { Controller, Get, Post, Put, Body } from '@nestjs/common';
import { HrisSyncService } from './hris-sync.service.js';
import { ImportCsvDto, ConfigureWatcherDto, TriggerBatchDto } from './dto/hris-sync.dto.js';

@Controller('hris-sync')
export class HrisSyncController {
  constructor(private readonly hrisSyncService: HrisSyncService) {}

  @Post('import/csv')
  importCsv(@Body() dto: ImportCsvDto) {
    return this.hrisSyncService.importCsv(dto);
  }

  @Post('import/batch')
  triggerBatch(@Body() dto: TriggerBatchDto) {
    const sampleCsv = `external_ref,national_id,first_name,last_name,email,phone,person_type,site_id,status,start_date,end_date
EMP-001,1712345678,Carlos,Mendoza,carlos@example.com,,employee,site-main,ACTIVE,2025-01-01,
EMP-003,1799887766,David,Vargas,david@example.com,,employee,site-main,ACTIVE,2026-06-01,`;

    return this.hrisSyncService.importCsv({ csvContent: sampleCsv }, dto.sourceName ?? 'scheduled-folder-watcher.csv');
  }

  @Put('watcher')
  configureWatcher(@Body() dto: ConfigureWatcherDto) {
    return this.hrisSyncService.configureWatcher(dto);
  }

  @Get('watcher')
  getWatcherConfig() {
    return this.hrisSyncService.getWatcherConfig();
  }

  @Get('discrepancies')
  getDiscrepancies() {
    return this.hrisSyncService.getDiscrepancies();
  }

  @Get('batches')
  getImportBatches() {
    return this.hrisSyncService.getImportBatches();
  }

  @Get('persons')
  getPersons() {
    return this.hrisSyncService.getPersons();
  }
}
