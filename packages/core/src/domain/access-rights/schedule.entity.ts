import { ok, err, Result } from 'neverthrow';
import { ScheduleId, HolidayCalendarId } from './ids.js';
import { SiteId } from '../topology/ids.js';
import { DomainError, InvalidScheduleError, InvalidTimeWindowError } from './errors.js';

export interface TimeWindow {
  readonly dayOfWeek: number; // 1 = Mon, 2 = Tue, ..., 7 = Sun
  readonly startTime: string; // "HH:MM"
  readonly endTime: string;   // "HH:MM"
}

export type HolidayBehavior = 'block_all' | 'allow_all';

export interface ScheduleProps {
  readonly id: ScheduleId;
  readonly siteId: SiteId;
  readonly name: string;
  readonly windows: readonly TimeWindow[];
  readonly holidayCalendarId?: HolidayCalendarId | null;
  readonly holidayBehavior?: HolidayBehavior;
  readonly createdAt?: Date;
}

export class Schedule {
  private constructor(public readonly props: ScheduleProps) {}

  public static create(props: ScheduleProps): Result<Schedule, DomainError> {
    if (!props.id) {
      return err(new InvalidScheduleError('Schedule ID is required'));
    }
    if (!props.siteId) {
      return err(new InvalidScheduleError('Site ID is required'));
    }
    if (!props.name || props.name.trim().length === 0) {
      return err(new InvalidScheduleError('Schedule name cannot be empty'));
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    for (const w of props.windows) {
      if (w.dayOfWeek < 1 || w.dayOfWeek > 7) {
        return err(new InvalidTimeWindowError(`Invalid day of week: ${w.dayOfWeek}`));
      }
      if (!timeRegex.test(w.startTime) || !timeRegex.test(w.endTime)) {
        return err(new InvalidTimeWindowError(`Invalid time format in window: ${w.startTime} - ${w.endTime}`));
      }
      if (w.endTime <= w.startTime) {
        return err(new InvalidTimeWindowError(`End time must be after start time: ${w.startTime} to ${w.endTime}`));
      }
    }

    return ok(new Schedule({
      id: props.id,
      siteId: props.siteId,
      name: props.name.trim(),
      windows: Object.freeze([...props.windows]),
      holidayCalendarId: props.holidayCalendarId ?? null,
      holidayBehavior: props.holidayBehavior ?? 'block_all',
      createdAt: props.createdAt ?? new Date(),
    }));
  }

  get id(): ScheduleId { return this.props.id; }
  get siteId(): SiteId { return this.props.siteId; }
  get name(): string { return this.props.name; }
  get windows(): readonly TimeWindow[] { return this.props.windows; }
  get holidayCalendarId(): HolidayCalendarId | null { return this.props.holidayCalendarId ?? null; }
  get holidayBehavior(): HolidayBehavior { return this.props.holidayBehavior ?? 'block_all'; }

  public isTimeAllowed(at: Date, isHoliday = false): boolean {
    if (isHoliday && this.holidayBehavior === 'block_all') {
      return false;
    }

    // Convert JS day of week (0=Sun, 1=Mon...6=Sat) to 1=Mon...7=Sun
    const jsDay = at.getDay();
    const dow = jsDay === 0 ? 7 : jsDay;

    const hours = String(at.getHours()).padStart(2, '0');
    const minutes = String(at.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hours}:${minutes}`;

    return this.props.windows.some((w) => {
      if (w.dayOfWeek !== dow) return false;
      return currentTimeStr >= w.startTime && currentTimeStr <= w.endTime;
    });
  }
}
