import { DoorId } from '../topology/ids.js';
import { CompiledAccessMatrix, CompiledCredentialEntry, ScheduleWindow, DecisionHolidayCalendar } from './types.js';

export interface UserAccessLevelInput {
  personId: string;
  credentialHash: string;
  isBlocked?: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  hasActiveAbsenceBlocking?: boolean;
  hasExpiredDocuments?: boolean;
  normalPin?: string | null;
  duressPin?: string | null;
  doors: {
    doorId: DoorId;
    windows: ScheduleWindow[];
  }[];
  holidays?: DecisionHolidayCalendar[];
}

export interface CompileMatrixInput {
  controllerId: string;
  matrixVersion: number;
  userAccessLevels: UserAccessLevelInput[];
}

export function compileAccessMatrix(input: CompileMatrixInput): CompiledAccessMatrix {
  const credentials: Record<string, CompiledCredentialEntry> = {};

  for (const item of input.userAccessLevels) {
    const allowedDoorIds: DoorId[] = [];
    const schedulesByDoor: Record<string, ScheduleWindow[]> = {};

    for (const doorConfig of item.doors) {
      allowedDoorIds.push(doorConfig.doorId);
      schedulesByDoor[doorConfig.doorId] = doorConfig.windows;
    }

    credentials[item.credentialHash] = {
      credentialHash: item.credentialHash,
      personId: item.personId,
      isBlocked: item.isBlocked ?? false,
      validFrom: item.validFrom ?? null,
      validUntil: item.validUntil ?? null,
      hasActiveAbsenceBlocking: item.hasActiveAbsenceBlocking ?? false,
      hasExpiredDocuments: item.hasExpiredDocuments ?? false,
      normalPin: item.normalPin ?? null,
      duressPin: item.duressPin ?? null,
      allowedDoorIds,
      schedulesByDoor,
      holidays: item.holidays ?? [],
    };
  }

  return {
    matrixVersion: input.matrixVersion,
    controllerId: input.controllerId,
    compiledAt: new Date().toISOString(),
    credentials,
  };
}
