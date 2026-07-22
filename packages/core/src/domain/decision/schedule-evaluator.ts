import { ScheduleWindow, HolidayCalendar } from './types.js';

export function isWithinSchedule(
  at: Date,
  windows: ScheduleWindow[] | undefined,
  holidays: HolidayCalendar[] | undefined
): boolean {
  // ISO date format YYYY-MM-DD
  const isoDate = at.toISOString().split('T')[0]!;
  if (holidays && holidays.length > 0) {
    const holiday = holidays.find((h) => h.date === isoDate);
    if (holiday) {
      return holiday.allowsAccess;
    }
  }

  if (!windows || windows.length === 0) {
    return false;
  }

  const dayOfWeek = at.getUTCDay(); // 0-6
  const currentMinute = at.getUTCHours() * 60 + at.getUTCMinutes();

  return windows.some(
    (w) => w.dayOfWeek === dayOfWeek && currentMinute >= w.startMinute && currentMinute <= w.endMinute
  );
}
