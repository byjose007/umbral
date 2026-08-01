import { TimeWindow, HolidayBehavior } from '../access-rights/schedule.entity.js';
import { Holiday } from '../access-rights/holiday-calendar.entity.js';
import { ScheduleWindow, DecisionHolidayCalendar } from './types.js';

const HHMM_TO_MINUTES = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** access-rights TimeWindow uses ISO dayOfWeek (1=Mon..7=Sun); the decision engine uses JS dayOfWeek (0=Sun..6=Sat). */
export function timeWindowToScheduleWindow(window: TimeWindow): ScheduleWindow {
  return {
    dayOfWeek: window.dayOfWeek === 7 ? 0 : window.dayOfWeek,
    startMinute: HHMM_TO_MINUTES(window.startTime),
    endMinute: HHMM_TO_MINUTES(window.endTime),
  };
}

export function timeWindowsToScheduleWindows(windows: readonly TimeWindow[]): ScheduleWindow[] {
  return windows.map(timeWindowToScheduleWindow);
}

export function holidaysToDecisionCalendar(
  holidays: readonly Holiday[],
  holidayBehavior: HolidayBehavior
): DecisionHolidayCalendar[] {
  return holidays.map((h) => ({
    date: h.date,
    allowsAccess: holidayBehavior === 'allow_all',
  }));
}
