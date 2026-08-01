import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CompiledAccessMatrix,
  DecisionHolidayCalendar,
  ScheduleWindow,
  BlockReasonCode,
  DoorId,
  timeWindowsToScheduleWindows,
  holidaysToDecisionCalendar,
  compileAccessMatrix,
} from '@umbral/core';
import { IdentityService } from '../identity/identity.service';
import { CredentialsService } from '../credentials/credentials.service';
import { AccessRightsService } from '../access-rights/access-rights.service';

export type AccessMatrixDenyReason = BlockReasonCode | 'NO_ACTIVE_CREDENTIAL' | 'PERSON_NOT_FOUND';

export type AccessMatrixCompilationResult =
  | { ok: true; credentialHash: string; matrix: CompiledAccessMatrix }
  | { ok: false; reasonCode: AccessMatrixDenyReason; message: string };

/**
 * Joins identity + credentials + access-rights (groups/access-levels/schedules/holidays) into the
 * CompiledAccessMatrix shape the decision engine (evaluateAccess) expects — for a single person,
 * on demand. This is the missing "compiler" for real-world access data; every other caller of
 * compileAccessMatrix today feeds it hand-built mock data.
 */
@Injectable()
export class AccessMatrixCompilerService {
  constructor(
    private readonly identityService: IdentityService,
    private readonly credentialsService: CredentialsService,
    private readonly accessRightsService: AccessRightsService,
  ) {}

  public compileForPerson(personId: string, at: Date = new Date()): AccessMatrixCompilationResult {
    let accessStatus: ReturnType<IdentityService['evaluatePersonAccessStatus']>;
    try {
      accessStatus = this.identityService.evaluatePersonAccessStatus(personId, at.toISOString());
    } catch (e) {
      if (e instanceof NotFoundException) {
        return { ok: false, reasonCode: 'PERSON_NOT_FOUND', message: `Person ${personId} not found` };
      }
      throw e;
    }

    if (accessStatus.status === 'blocked') {
      return { ok: false, reasonCode: accessStatus.reasonCode, message: accessStatus.message };
    }

    const credentials = this.credentialsService.getCredentialsForPerson(personId);
    const activeQrCredential = credentials.find(
      (c) => c.credentialType === 'qr_dynamic' && c.status === 'active',
    );
    if (!activeQrCredential) {
      return {
        ok: false,
        reasonCode: 'NO_ACTIVE_CREDENTIAL',
        message: `Person ${personId} has no active qr_dynamic credential`,
      };
    }

    const assignments = this.accessRightsService
      .getPersonGroupAssignments(personId)
      .filter((a) => this.isAssignmentActiveAt(a, at));

    const allGroups = this.accessRightsService.getGroups();
    const allAccessLevels = this.accessRightsService.getAccessLevels();
    const allSchedules = this.accessRightsService.getSchedules();
    const allHolidayCalendars = this.accessRightsService.getHolidayCalendars();

    const groupIds = new Set(assignments.map((a) => a.groupId));
    const accessLevelIds = new Set<string>();
    for (const group of allGroups) {
      if (groupIds.has(group.id)) {
        group.accessLevelIds.forEach((alId) => accessLevelIds.add(alId));
      }
    }

    const doorsConfig: { doorId: DoorId; windows: ScheduleWindow[] }[] = [];
    const holidaysByDate = new Map<string, DecisionHolidayCalendar>();

    for (const accessLevel of allAccessLevels) {
      if (!accessLevelIds.has(accessLevel.id)) continue;

      for (const entry of accessLevel.entries) {
        const schedule = allSchedules.find((s) => s.id === entry.scheduleId);
        if (!schedule) continue;

        doorsConfig.push({
          doorId: entry.doorId,
          windows: timeWindowsToScheduleWindows(schedule.windows),
        });

        if (schedule.holidayCalendarId) {
          const calendar = allHolidayCalendars.find((c) => c.id === schedule.holidayCalendarId);
          if (calendar) {
            for (const decisionHoliday of holidaysToDecisionCalendar(calendar.holidays, schedule.holidayBehavior ?? 'block_all')) {
              holidaysByDate.set(decisionHoliday.date, decisionHoliday);
            }
          }
        }
      }
    }

    const matrix = compileAccessMatrix({
      controllerId: 'guard-pwa-realtime',
      matrixVersion: 1,
      userAccessLevels: [
        {
          personId,
          credentialHash: activeQrCredential.credentialHash,
          isBlocked: false,
          validFrom: activeQrCredential.validFrom ? activeQrCredential.validFrom.toISOString() : null,
          validUntil: activeQrCredential.validUntil ? activeQrCredential.validUntil.toISOString() : null,
          hasActiveAbsenceBlocking: false,
          hasExpiredDocuments: false,
          doors: doorsConfig,
          holidays: Array.from(holidaysByDate.values()),
        },
      ],
    });

    return { ok: true, credentialHash: activeQrCredential.credentialHash, matrix };
  }

  private isAssignmentActiveAt(
    assignment: { validFrom: Date; validUntil?: Date | null },
    at: Date,
  ): boolean {
    if (at.getTime() < new Date(assignment.validFrom).getTime()) return false;
    if (assignment.validUntil && at.getTime() > new Date(assignment.validUntil).getTime()) return false;
    return true;
  }
}
