export class QueryFlowAggregatesDto {
  siteId?: string;
  startDate?: string;
  endDate?: string;
}

export class QueryTrajectoryDto {
  operatorId!: string;
  operatorRoles?: string[];
  justification!: string;
}

export class SaveFilterDto {
  operatorId!: string;
  name!: string;
  siteId?: string;
  dateRangeDays?: number;
  isScheduled?: boolean;
  cronSchedule?: string;
  exportFormat?: 'csv' | 'json' | 'pdf';
}

export class ExportReportDto {
  filterId?: string;
  format?: 'csv' | 'json' | 'pdf';
  reportType!: 'flow' | 'occupancy' | 'anomalies' | 'health';
}
