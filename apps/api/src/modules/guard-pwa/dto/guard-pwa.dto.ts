export interface SaveMusterSnapshotDto {
  readonly siteId: string;
  readonly initiatedBy: string;
  readonly occupantsSnapshot: Array<{
    personId: string;
    pseudonym: string;
    fullName?: string;
    zoneId: string;
    status: 'present_inside' | 'evacuated_accounted' | 'missing';
  }>;
}

export interface RecordGuardOverrideLogDto {
  readonly guardPersonId: string;
  readonly targetPersonId?: string;
  readonly targetDocument?: string;
  readonly doorId: string;
  readonly reason: string;
  readonly action: 'manual_contingency_grant' | 'manual_contingency_deny' | 'identity_unmask_audit';
}
