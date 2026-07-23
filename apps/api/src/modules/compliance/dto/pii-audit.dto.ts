import { PiiAccessType } from '@umbral/core';

export class RecordPiiAccessDto {
  operatorId!: string;
  operatorRoles?: string[];
  targetPersonId!: string;
  accessType!: PiiAccessType;
  justification!: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export class QueryPiiAuditDto {
  operatorId?: string;
  targetPersonId?: string;
  accessType?: PiiAccessType;
  limit?: number;
}
