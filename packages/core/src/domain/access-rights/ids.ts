export type ScheduleId = string & { readonly __brand: 'ScheduleId' };
export type HolidayCalendarId = string & { readonly __brand: 'HolidayCalendarId' };
export type AccessLevelId = string & { readonly __brand: 'AccessLevelId' };
export type GroupId = string & { readonly __brand: 'GroupId' };

export const makeScheduleId = (id: string): ScheduleId => id as ScheduleId;
export const makeHolidayCalendarId = (id: string): HolidayCalendarId => id as HolidayCalendarId;
export const makeAccessLevelId = (id: string): AccessLevelId => id as AccessLevelId;
export const makeGroupId = (id: string): GroupId => id as GroupId;
