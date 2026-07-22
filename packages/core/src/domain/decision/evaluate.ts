import { DecisionInput, Decision } from './types.js';
import { isWithinSchedule } from './schedule-evaluator.js';
import { evaluateAPB } from './apb-evaluator.js';

export function evaluateAccess(input: DecisionInput): Decision {
  const { localState, credentialHash, doorId, at, presentedPin, readerZoneInsideId } = input;

  if (localState.isOffline) {
    if (localState.offlineMode === 'deny_all') {
      return { kind: 'denied', reasonCode: 'OFFLINE_DENY_ALL' };
    }
    if (localState.offlineMode === 'unlocked') {
      return { kind: 'granted', reasonCode: 'UNLOCKED_MODE' };
    }
  }

  if (localState.interlockBlockedDoors?.includes(doorId)) {
    return { kind: 'denied', reasonCode: 'INTERLOCK_BLOCKED' };
  }

  const cred = localState.matrix?.credentials?.[credentialHash];
  if (!cred) {
    return { kind: 'denied', reasonCode: 'UNKNOWN_CREDENTIAL' };
  }

  if (cred.isBlocked) {
    return { kind: 'denied', reasonCode: 'CREDENTIAL_BLOCKED' };
  }

  if (cred.hasActiveAbsenceBlocking) {
    return { kind: 'denied', reasonCode: 'ABSENCE_ACTIVE' };
  }

  if (cred.hasExpiredDocuments) {
    return { kind: 'denied', reasonCode: 'DOCUMENT_EXPIRED' };
  }

  if (cred.validFrom && at.getTime() < new Date(cred.validFrom).getTime()) {
    return { kind: 'denied', reasonCode: 'CREDENTIAL_EXPIRED' };
  }

  if (cred.validUntil && at.getTime() > new Date(cred.validUntil).getTime()) {
    return { kind: 'denied', reasonCode: 'CREDENTIAL_EXPIRED' };
  }

  if (!cred.allowedDoorIds || !cred.allowedDoorIds.includes(doorId)) {
    return { kind: 'denied', reasonCode: 'OUT_OF_SCHEDULE' };
  }

  if (presentedPin) {
    if (cred.duressPin && presentedPin === cred.duressPin) {
      return { kind: 'granted', reasonCode: 'DURESS_MATCH', silentAlarm: 'duress' };
    }
    if (cred.normalPin && presentedPin !== cred.normalPin) {
      return { kind: 'denied', reasonCode: 'OUT_OF_SCHEDULE' };
    }
  }

  const doorWindows = cred.schedulesByDoor?.[doorId];
  if (!isWithinSchedule(at, doorWindows, cred.holidays)) {
    return { kind: 'denied', reasonCode: 'OUT_OF_SCHEDULE' };
  }

  const apbResult = evaluateAPB(
    credentialHash,
    readerZoneInsideId,
    localState.apbMode,
    localState.apbResetSec,
    localState.lastPassState,
    at
  );

  if (apbResult.shouldDeny) {
    return { kind: 'denied', reasonCode: 'APB_VIOLATION' };
  }

  if (apbResult.isViolation) {
    return { kind: 'granted', reasonCode: 'SCHEDULE_MATCH', apbViolation: true };
  }

  return { kind: 'granted', reasonCode: 'SCHEDULE_MATCH' };
}
