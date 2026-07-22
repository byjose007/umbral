import { HolidayBehavior } from '@umbral/core';

export interface TimeWindowDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CreateScheduleDto {
  siteId: string;
  name: string;
  windows: TimeWindowDto[];
  holidayCalendarId?: string;
  holidayBehavior?: HolidayBehavior;
}

export interface HolidayDto {
  date: string; // YYYY-MM-DD
  name: string;
  isNational?: boolean;
}

export interface CreateHolidayCalendarDto {
  siteId: string;
  name: string;
  holidays: HolidayDto[];
}

export interface AccessLevelEntryDto {
  doorId: string;
  scheduleId: string;
}

export interface CreateAccessLevelDto {
  siteId: string;
  name: string;
  description?: string;
  entries: AccessLevelEntryDto[];
}

export interface CreateGroupDto {
  siteId: string;
  name: string;
  description?: string;
  accessLevelIds: string[];
}

export interface AssignPersonToGroupDto {
  personId: string;
  groupId: string;
  validFrom: string; // ISO string
  validUntil?: string; // ISO string
}
