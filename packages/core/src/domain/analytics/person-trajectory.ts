import { ok, err, Result } from 'neverthrow';
import { DomainError, UnauthorizedTrajectoryAccessError } from './errors.js';
import { AccessEvent } from '../events-audit/access-event.entity.js';
import { PiiAccessAuditLog, makePiiAuditLogId } from '../compliance/index.js';

export interface TrajectoryStep {
  readonly sequence: number;
  readonly timestamp: Date;
  readonly siteId: string;
  readonly doorId?: string;
  readonly direction?: 'in' | 'out';
  readonly eventType: string;
}

export interface PersonTrajectoryResult {
  readonly personId: string;
  readonly queriedByOperatorId: string;
  readonly queriedAt: Date;
  readonly totalSteps: number;
  readonly trajectory: TrajectoryStep[];
  readonly piiAuditLogId: string;
}

export class PersonTrajectoryTracker {
  public static getTrajectory(
    events: AccessEvent[],
    targetPersonId: string,
    operatorId: string,
    operatorRoles: string[],
    justification: string
  ): Result<{ trajectory: PersonTrajectoryResult; auditLog: PiiAccessAuditLog }, DomainError> {
    const isAuthorized =
      operatorRoles.includes('admin') ||
      operatorRoles.includes('security_supervisor') ||
      operatorRoles.includes('compliance_officer') ||
      operatorRoles.includes('analytics:tracking');

    if (!isAuthorized) {
      return err(new UnauthorizedTrajectoryAccessError(operatorId, targetPersonId));
    }

    const auditId = makePiiAuditLogId(`pii-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    const auditRes = PiiAccessAuditLog.create({
      id: auditId,
      operatorId,
      targetPersonId,
      accessType: 'TRAJECTORY_QUERY',
      justification,
      timestamp: new Date(),
    });

    if (auditRes.isErr()) {
      return err(auditRes.error);
    }

    const personEvents = events
      .filter(e => e.personId === targetPersonId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const trajectory: TrajectoryStep[] = personEvents.map((e, idx) => ({
      sequence: idx + 1,
      timestamp: e.timestamp,
      siteId: e.siteId,
      doorId: e.doorId ?? undefined,
      direction: e.direction ?? undefined,
      eventType: e.eventType,
    }));

    const result: PersonTrajectoryResult = {
      personId: targetPersonId,
      queriedByOperatorId: operatorId,
      queriedAt: new Date(),
      totalSteps: trajectory.length,
      trajectory,
      piiAuditLogId: auditId,
    };

    return ok({ trajectory: result, auditLog: auditRes.value });
  }
}
