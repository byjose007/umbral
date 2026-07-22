import { AntiPassbackMode, APBStateEntry } from './types.js';

export interface APBCheckResult {
  isViolation: boolean;
  shouldDeny: boolean;
  reason?: string;
}

export function evaluateAPB(
  credentialHash: string,
  targetZoneId: string | undefined,
  apbMode: AntiPassbackMode | undefined,
  apbResetSec: number | undefined,
  lastPassState: Record<string, APBStateEntry> | undefined,
  at: Date
): APBCheckResult {
  if (!apbMode || apbMode === 'off' || !targetZoneId || !lastPassState) {
    return { isViolation: false, shouldDeny: false };
  }

  const lastPass = lastPassState[credentialHash];
  if (!lastPass) {
    return { isViolation: false, shouldDeny: false };
  }

  const isReentryInSameZone = lastPass.lastZoneId === targetZoneId;
  if (!isReentryInSameZone) {
    return { isViolation: false, shouldDeny: false };
  }

  if (apbMode === 'timed' && apbResetSec) {
    const elapsedSec = (at.getTime() - new Date(lastPass.lastTimestamp).getTime()) / 1000;
    if (elapsedSec >= apbResetSec) {
      return { isViolation: false, shouldDeny: false };
    }
  }

  if (apbMode === 'soft') {
    return { isViolation: true, shouldDeny: false, reason: 'Soft Anti-Passback Violation' };
  }

  // hard or un-reset timed APB
  return { isViolation: true, shouldDeny: true, reason: 'Anti-Passback Violation' };
}

export function detectImpossibleTravel(
  lastTimestamp: Date | string,
  lastReaderId: string,
  currentTimestamp: Date | string,
  currentReaderId: string,
  minTravelTimeSec: number = 300
): boolean {
  if (lastReaderId === currentReaderId) {
    return false;
  }

  const lastTime = new Date(lastTimestamp).getTime();
  const currTime = new Date(currentTimestamp).getTime();
  const elapsedSec = Math.abs(currTime - lastTime) / 1000;

  return elapsedSec < minTravelTimeSec;
}
