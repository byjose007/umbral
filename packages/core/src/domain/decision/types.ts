import { DoorId, ReaderId } from '../topology/ids.js';

export type OfflineMode = 'cached' | 'deny_all' | 'allow_known' | 'unlocked';
export type AntiPassbackMode = 'off' | 'soft' | 'hard' | 'timed';

export type GrantReason =
  | 'SCHEDULE_MATCH'
  | 'DURESS_MATCH'
  | 'UNLOCKED_MODE'
  | 'ALLOW_KNOWN';

export type DenyReason =
  | 'UNKNOWN_CREDENTIAL'
  | 'ABSENCE_ACTIVE'
  | 'CREDENTIAL_BLOCKED'
  | 'CREDENTIAL_EXPIRED'
  | 'OUT_OF_SCHEDULE'
  | 'DOCUMENT_EXPIRED'
  | 'APB_VIOLATION'
  | 'INTERLOCK_BLOCKED'
  | 'OFFLINE_DENY_ALL';

export type Decision =
  | { kind: 'granted'; reasonCode: GrantReason; silentAlarm?: 'duress'; apbViolation?: boolean }
  | { kind: 'denied'; reasonCode: DenyReason };

export interface ScheduleWindow {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startMinute: number; // 0..1439
  endMinute: number; // 0..1439
}

export interface DecisionHolidayCalendar {
  date: string; // "YYYY-MM-DD"
  allowsAccess: boolean;
}

export interface CompiledCredentialEntry {
  credentialHash: string;
  personId: string;
  isBlocked: boolean;
  validFrom: string | null;
  validUntil: string | null;
  hasActiveAbsenceBlocking: boolean;
  hasExpiredDocuments: boolean;
  normalPin?: string | null;
  duressPin?: string | null;
  allowedDoorIds: DoorId[];
  schedulesByDoor: Record<string, ScheduleWindow[]>;
  holidays?: DecisionHolidayCalendar[];
}

export interface CompiledAccessMatrix {
  matrixVersion: number;
  controllerId: string;
  compiledAt: string;
  credentials: Record<string, CompiledCredentialEntry>;
}

export interface APBStateEntry {
  lastZoneId: string;
  lastReaderId: string;
  lastTimestamp: string;
}

export interface LocalAccessState {
  matrix: CompiledAccessMatrix;
  offlineMode: OfflineMode;
  isOffline: boolean;
  apbMode?: AntiPassbackMode;
  apbResetSec?: number;
  lastPassState?: Record<string, APBStateEntry>;
  interlockBlockedDoors?: string[];
}

export interface DecisionInput {
  readonly credentialHash: string;
  readonly doorId: DoorId;
  readonly readerId: ReaderId;
  readonly at: Date;
  readonly localState: LocalAccessState;
  readonly presentedPin?: string;
  readonly readerZoneInsideId?: string;
  readonly readerZoneOutsideId?: string;
}
