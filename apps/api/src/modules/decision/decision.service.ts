import { Injectable } from '@nestjs/common';
import {
  evaluateAccess,
  compileAccessMatrix,
  makeDoorId,
  makeReaderId,
  Decision,
  CompiledAccessMatrix,
  LocalAccessState,
  APBStateEntry,
} from '@umbral/core';
import { EvaluateDecisionDto, CompileMatrixDto } from './dto/decision.dto';

export interface DecisionEvaluationResult {
  decision: Decision;
  evaluatedAt: string;
  executionMs: number;
  serverMirror: boolean;
}

/**
 * Anti-passback state (lastPassState) is owned here, not by the caller. If every reader channel
 * (guard-pwa, future hardware controllers via device-gateway) kept its own copy, anti-passback
 * would silently diverge between channels — the whole point of a shared engine is a shared state.
 * The `lastPassState` a caller sends in is ignored for APB purposes; this service's own map wins.
 */
@Injectable()
export class DecisionService {
  private readonly lastPassState = new Map<string, APBStateEntry>();

  public evaluate(dto: EvaluateDecisionDto): DecisionEvaluationResult {
    const startTime = performance.now();

    const atDate = dto.at ? new Date(dto.at) : new Date();
    const localState: LocalAccessState = {
      matrix: dto.localState.matrix,
      offlineMode: dto.localState.offlineMode,
      isOffline: dto.localState.isOffline,
      apbMode: dto.localState.apbMode,
      apbResetSec: dto.localState.apbResetSec,
      lastPassState: Object.fromEntries(this.lastPassState),
      interlockBlockedDoors: dto.localState.interlockBlockedDoors,
    };

    const decision = evaluateAccess({
      credentialHash: dto.credentialHash,
      doorId: makeDoorId(dto.doorId),
      readerId: makeReaderId(dto.readerId),
      at: atDate,
      localState,
      presentedPin: dto.presentedPin || undefined,
      readerZoneInsideId: dto.readerZoneInsideId || undefined,
    });

    if (decision.kind === 'granted' && dto.readerZoneInsideId) {
      this.lastPassState.set(dto.credentialHash, {
        lastZoneId: dto.readerZoneInsideId,
        lastReaderId: dto.readerId,
        lastTimestamp: atDate.toISOString(),
      });
    }

    const endTime = performance.now();
    const executionMs = Number((endTime - startTime).toFixed(3));

    return {
      decision,
      evaluatedAt: atDate.toISOString(),
      executionMs,
      serverMirror: true,
    };
  }

  public compileMatrix(dto: CompileMatrixDto): CompiledAccessMatrix {
    return compileAccessMatrix({
      controllerId: dto.controllerId,
      matrixVersion: dto.matrixVersion,
      userAccessLevels: dto.userAccessLevels.map((u) => ({
        personId: u.personId,
        credentialHash: u.credentialHash,
        isBlocked: u.isBlocked,
        validFrom: u.validFrom,
        validUntil: u.validUntil,
        hasActiveAbsenceBlocking: u.hasActiveAbsenceBlocking,
        hasExpiredDocuments: u.hasExpiredDocuments,
        normalPin: u.normalPin,
        duressPin: u.duressPin,
        doors: u.doors.map((d) => ({
          doorId: makeDoorId(d.doorId),
          windows: d.windows,
        })),
      })),
    });
  }
}
