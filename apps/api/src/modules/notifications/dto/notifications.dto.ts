export interface DispatchNotificationDto {
  readonly alertId: string;
  readonly templateId:
    | 'FORCED_DOOR'
    | 'HELD_OPEN'
    | 'TAILGATING_SUSPECT'
    | 'DURESS_ALARM'
    | 'MUSTER_EVACUATION';
  readonly recipientRole: 'security' | 'administrator' | 'facility_manager';
  readonly recipientTarget: string; // Phone, Email, or Web Push Device Token
  readonly channel: 'whatsapp' | 'email' | 'webpush';
  readonly locale?: 'es' | 'en';
  readonly payload: Record<string, unknown>;
}

export interface TestChannelDto {
  readonly channel: 'whatsapp' | 'email' | 'webpush';
  readonly recipientTarget: string;
  readonly locale?: 'es' | 'en';
  readonly templateId?: string;
}

export interface GetNotificationLogsDto {
  readonly alertId?: string;
  readonly status?: 'queued' | 'sent' | 'failed' | 'retrying';
  readonly limit?: number;
}
