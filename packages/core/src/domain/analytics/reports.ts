import { SavedFilterId } from './ids.js';

export interface SavedReportFilterProps {
  readonly id: SavedFilterId;
  readonly name: string;
  readonly createdByOperatorId: string;
  readonly siteId?: string;
  readonly dateRangeDays?: number;
  readonly eventTypes?: string[];
  readonly minSeverity?: string;
  readonly isScheduled: boolean;
  readonly cronSchedule?: string; // e.g. "0 8 * * *"
  readonly exportFormat: 'csv' | 'json' | 'pdf';
  readonly createdAt: Date;
}

export class SavedReportFilter {
  constructor(public readonly props: SavedReportFilterProps) {}

  get id(): SavedFilterId { return this.props.id; }
  get name(): string { return this.props.name; }
  get isScheduled(): boolean { return this.props.isScheduled; }
  get exportFormat(): 'csv' | 'json' | 'pdf' { return this.props.exportFormat; }
}

export class ReportExporter {
  public static exportToCsv<T extends Record<string, unknown>>(data: T[]): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(item =>
      headers.map(h => {
        const val = item[h];
        if (val instanceof Date) return `"${val.toISOString()}"`;
        if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
        return String(val ?? '');
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  public static exportToJson<T>(data: T[]): string {
    return JSON.stringify(data, null, 2);
  }
}
