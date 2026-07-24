export class ImportCsvDto {
  csvContent!: string;
  siteId?: string;
}

export class ConfigureWatcherDto {
  folderPath!: string;
  pollIntervalMinutes?: number;
  autoProcess?: boolean;
}

export class TriggerBatchDto {
  sourceName?: string;
}
