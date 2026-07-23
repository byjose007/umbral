import { ComplianceDataType } from '@umbral/core';

export class CreateRetentionPolicyDto {
  dataType!: ComplianceDataType;
  retentionDays!: number;
  autoPurgeEnabled!: boolean;
  description?: string;
}

export class ExecutePurgeDto {
  dataType?: ComplianceDataType;
}
