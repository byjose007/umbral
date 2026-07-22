import { ok, err, Result } from 'neverthrow';
import { HolidayCalendarId } from './ids.js';
import { SiteId } from '../topology/ids.js';
import { DomainError, AccessRightsError } from './errors.js';

export interface Holiday {
  readonly date: string; // YYYY-MM-DD
  readonly name: string;
  readonly isNational: boolean;
}

export interface HolidayCalendarProps {
  readonly id: HolidayCalendarId;
  readonly siteId: SiteId;
  readonly name: string;
  readonly holidays: readonly Holiday[];
  readonly createdAt?: Date;
}

export class HolidayCalendar {
  private constructor(public readonly props: HolidayCalendarProps) {}

  public static create(props: HolidayCalendarProps): Result<HolidayCalendar, DomainError> {
    if (!props.id) {
      return err(new AccessRightsError('Holiday calendar ID is required'));
    }
    if (!props.siteId) {
      return err(new AccessRightsError('Site ID is required'));
    }
    if (!props.name || props.name.trim().length === 0) {
      return err(new AccessRightsError('Holiday calendar name cannot be empty'));
    }

    // Validate holiday date strings
    for (const h of props.holidays) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(h.date)) {
        return err(new AccessRightsError(`Invalid holiday date format: ${h.date}`));
      }
    }

    return ok(new HolidayCalendar({
      id: props.id,
      siteId: props.siteId,
      name: props.name.trim(),
      holidays: Object.freeze([...props.holidays]),
      createdAt: props.createdAt ?? new Date(),
    }));
  }

  get id(): HolidayCalendarId { return this.props.id; }
  get siteId(): SiteId { return this.props.siteId; }
  get name(): string { return this.props.name; }
  get holidays(): readonly Holiday[] { return this.props.holidays; }

  public isHoliday(at: Date): boolean {
    const year = at.getFullYear();
    const month = String(at.getMonth() + 1).padStart(2, '0');
    const day = String(at.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    return this.props.holidays.some((h) => h.date === dateStr);
  }
}
