import { describe, it, expect } from 'vitest';
import { Schedule } from '../schedule.entity.js';
import { HolidayCalendar } from '../holiday-calendar.entity.js';
import { AccessLevel } from '../access-level.entity.js';
import { Group } from '../group.entity.js';
import { PersonGroupAssignment } from '../person-group.entity.js';
import { makeScheduleId, makeHolidayCalendarId, makeAccessLevelId, makeGroupId } from '../ids.js';
import { makeSiteId, makeDoorId } from '../../topology/ids.js';
import { makePersonId } from '../../identity/ids.js';

describe('Access Rights Domain', () => {
  const siteId = makeSiteId('site-01');
  const door1 = makeDoorId('door-1');
  const personId = makePersonId('person-1');

  it('evaluates weekly time windows in Schedule', () => {
    const sched = Schedule.create({
      id: makeScheduleId('sched-workhours'),
      siteId,
      name: 'Horario Laboral L-V',
      windows: [
        { dayOfWeek: 1, startTime: '07:00', endTime: '19:00' }, // Mon
        { dayOfWeek: 2, startTime: '07:00', endTime: '19:00' }, // Tue
        { dayOfWeek: 3, startTime: '07:00', endTime: '19:00' }, // Wed
        { dayOfWeek: 4, startTime: '07:00', endTime: '19:00' }, // Thu
        { dayOfWeek: 5, startTime: '07:00', endTime: '19:00' }, // Fri
      ],
    })._unsafeUnwrap();

    // Tuesday 10:00 AM (Within schedule)
    const tuesdayMorning = new Date('2026-07-14T10:00:00'); // July 14, 2026 is Tuesday
    expect(sched.isTimeAllowed(tuesdayMorning)).toBe(true);

    // Saturday 10:00 AM (Outside schedule)
    const saturdayMorning = new Date('2026-07-18T10:00:00'); // July 18, 2026 is Saturday
    expect(sched.isTimeAllowed(saturdayMorning)).toBe(false);

    // Tuesday 20:00 PM (Outside window hours)
    const tuesdayNight = new Date('2026-07-14T20:00:00');
    expect(sched.isTimeAllowed(tuesdayNight)).toBe(false);
  });

  it('evaluates holiday behavior in Schedule', () => {
    const calendar = HolidayCalendar.create({
      id: makeHolidayCalendarId('cal-ec'),
      siteId,
      name: 'Feriados Ecuador',
      holidays: [
        { date: '2026-01-01', name: 'Año Nuevo', isNational: true },
        { date: '2026-05-01', name: 'Día del Trabajo', isNational: true },
      ],
    })._unsafeUnwrap();

    const janFirst = new Date('2026-01-01T10:00:00');
    expect(calendar.isHoliday(janFirst)).toBe(true);

    const sched = Schedule.create({
      id: makeScheduleId('sched-work'),
      siteId,
      name: 'Horario Ordinario',
      windows: [{ dayOfWeek: 4, startTime: '07:00', endTime: '19:00' }], // Jan 1, 2026 is Thursday
      holidayCalendarId: calendar.id,
      holidayBehavior: 'block_all',
    })._unsafeUnwrap();

    // On Jan 1 (Thursday), even inside 07:00-19:00, holiday behavior block_all denies access
    expect(sched.isTimeAllowed(janFirst, true)).toBe(false);
  });

  it('creates AccessLevel with Door x Schedule matrix entries', () => {
    const schedId = makeScheduleId('sched-1');
    const al = AccessLevel.create({
      id: makeAccessLevelId('al-warehouse'),
      siteId,
      name: 'Bodega Horario Laboral',
      description: 'Acceso a Bodega 1 en horario de oficina',
      entries: [
        { doorId: door1, scheduleId: schedId },
      ],
    })._unsafeUnwrap();

    expect(al.entries.length).toBe(1);
    expect(al.getScheduleForDoor(door1)).toBe(schedId);
  });

  it('assigns Group to Person with time validity', () => {
    const alId = makeAccessLevelId('al-1');
    const group = Group.create({
      id: makeGroupId('group-ops'),
      siteId,
      name: 'Operaciones',
      accessLevelIds: [alId],
    })._unsafeUnwrap();

    const assignment = PersonGroupAssignment.create({
      personId,
      groupId: group.id,
      validFrom: new Date('2026-07-01'),
      validUntil: new Date('2026-07-15'),
    })._unsafeUnwrap();

    // Within validity window
    expect(assignment.isActiveAt(new Date('2026-07-10'))).toBe(true);

    // After validUntil expires
    expect(assignment.isActiveAt(new Date('2026-07-16'))).toBe(false);
  });
});
