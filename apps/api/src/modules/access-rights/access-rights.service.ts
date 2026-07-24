import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  Schedule,
  HolidayCalendar,
  AccessLevel,
  Group,
  PersonGroupAssignment,
  makeScheduleId,
  makeHolidayCalendarId,
  makeAccessLevelId,
  makeGroupId,
  makeSiteId,
  makeDoorId,
  makePersonId,
} from '@umbral/core';
import {
  CreateScheduleDto,
  CreateHolidayCalendarDto,
  CreateAccessLevelDto,
  CreateGroupDto,
  AssignPersonToGroupDto,
} from './dto/access-rights.dto';
import { v4 as uuidv4 } from './uuid';

@Injectable()
export class AccessRightsService {
  private readonly holidayCalendarsMap = new Map<string, HolidayCalendar>();
  private readonly schedulesMap = new Map<string, Schedule>();
  private readonly accessLevelsMap = new Map<string, AccessLevel>();
  private readonly groupsMap = new Map<string, Group>();
  private readonly personAssignmentsMap = new Map<
    string,
    PersonGroupAssignment[]
  >();

  // Holiday Calendars
  public createHolidayCalendar(dto: CreateHolidayCalendarDto) {
    const id = makeHolidayCalendarId(uuidv4());
    const res = HolidayCalendar.create({
      id,
      siteId: makeSiteId(dto.siteId),
      name: dto.name,
      holidays: dto.holidays.map((h) => ({
        date: h.date,
        name: h.name,
        isNational: h.isNational ?? true,
      })),
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const calendar = res.value;
    this.holidayCalendarsMap.set(calendar.id, calendar);
    return calendar.props;
  }

  public getHolidayCalendars(siteId?: string) {
    let list = Array.from(this.holidayCalendarsMap.values());
    if (siteId) {
      list = list.filter((c) => c.siteId === siteId);
    }
    return list.map((c) => c.props);
  }

  // Schedules
  public createSchedule(dto: CreateScheduleDto) {
    const id = makeScheduleId(uuidv4());
    const res = Schedule.create({
      id,
      siteId: makeSiteId(dto.siteId),
      name: dto.name,
      windows: dto.windows,
      holidayCalendarId: dto.holidayCalendarId
        ? makeHolidayCalendarId(dto.holidayCalendarId)
        : null,
      holidayBehavior: dto.holidayBehavior ?? 'block_all',
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const schedule = res.value;
    this.schedulesMap.set(schedule.id, schedule);
    return schedule.props;
  }

  public getSchedules(siteId?: string) {
    let list = Array.from(this.schedulesMap.values());
    if (siteId) {
      list = list.filter((s) => s.siteId === siteId);
    }
    return list.map((s) => s.props);
  }

  // Access Levels
  public createAccessLevel(dto: CreateAccessLevelDto) {
    const id = makeAccessLevelId(uuidv4());
    const res = AccessLevel.create({
      id,
      siteId: makeSiteId(dto.siteId),
      name: dto.name,
      description: dto.description,
      entries: dto.entries.map((e) => ({
        doorId: makeDoorId(e.doorId),
        scheduleId: makeScheduleId(e.scheduleId),
      })),
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const al = res.value;
    this.accessLevelsMap.set(al.id, al);
    return al.props;
  }

  public getAccessLevels(siteId?: string) {
    let list = Array.from(this.accessLevelsMap.values());
    if (siteId) {
      list = list.filter((al) => al.siteId === siteId);
    }
    return list.map((al) => al.props);
  }

  // Groups
  public createGroup(dto: CreateGroupDto) {
    const id = makeGroupId(uuidv4());
    const res = Group.create({
      id,
      siteId: makeSiteId(dto.siteId),
      name: dto.name,
      description: dto.description,
      accessLevelIds: dto.accessLevelIds.map((alId) => makeAccessLevelId(alId)),
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const group = res.value;
    this.groupsMap.set(group.id, group);
    return group.props;
  }

  public getGroups(siteId?: string) {
    let list = Array.from(this.groupsMap.values());
    if (siteId) {
      list = list.filter((g) => g.siteId === siteId);
    }
    return list.map((g) => g.props);
  }

  // Person-Group Assignments
  public assignPersonToGroup(dto: AssignPersonToGroupDto) {
    const group = this.groupsMap.get(dto.groupId);
    if (!group) {
      throw new NotFoundException(`Group ${dto.groupId} not found`);
    }

    const validFrom = new Date(dto.validFrom);
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : null;

    const res = PersonGroupAssignment.create({
      personId: makePersonId(dto.personId),
      groupId: group.id,
      validFrom,
      validUntil,
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const assignment = res.value;
    const existing = this.personAssignmentsMap.get(dto.personId) || [];
    existing.push(assignment);
    this.personAssignmentsMap.set(dto.personId, existing);

    return assignment.props;
  }

  public getPersonGroupAssignments(personId: string) {
    const existing = this.personAssignmentsMap.get(personId) || [];
    return existing.map((a) => a.props);
  }
}
