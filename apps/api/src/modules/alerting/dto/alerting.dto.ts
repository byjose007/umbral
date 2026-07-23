import { EventType, EventSeverity } from '@umbral/core';

export interface CreateAlertRuleDto {
  siteId: string;
  name: string;
  eventType: EventType;
  severity?: EventSeverity;
  dedupWindowSec?: number;
  escalationSec?: number;
  preAlarmSec?: number;
  channels?: string[];
}

export interface EvaluateEventDto {
  siteId: string;
  doorId?: string;
  eventType: EventType;
  severity?: EventSeverity;
  rawPersonId?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export interface AcknowledgeAlertDto {
  operatorUser: string;
}

export interface RevealPiiDto {
  operatorUser: string;
}

export interface QueryAlertsDto {
  siteId?: string;
  severity?: EventSeverity;
  status?: string;
  limit?: number;
}
