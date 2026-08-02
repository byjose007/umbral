import { EventType, EventSeverity } from '@umbral/core';

export interface RecordEventDto {
  chainPartition: string;
  eventType: EventType;
  severity?: EventSeverity;
  siteId: string;
  doorId?: string;
  controllerId?: string;
  personId?: string;
  credentialId?: string;
  direction?: 'in' | 'out';
  reasonCode?: string;
  details?: Record<string, unknown>;
  timestamp?: string; // ISO string
}

export interface QueryEventsDto {
  chainPartition?: string;
  doorId?: string;
  personId?: string;
  eventType?: EventType;
  limit?: number;
}

export interface VerifyChainDto {
  chainPartition: string;
}

export interface PurgeEventsDto {
  olderThanDays: number;
  eventType?: EventType;
}

export interface QueryFeedDto {
  siteId?: string;
  limit?: number;
}

export interface RevealEventPiiDto {
  operatorUser: string;
}
