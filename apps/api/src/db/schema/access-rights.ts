import {
  pgTable,
  varchar,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sites, doors } from './topology.js';
import { persons } from './identity.js';

export const holidayCalendars = pgTable(
  'holiday_calendars',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    siteId: varchar('site_id', { length: 36 })
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    siteIdIdx: index('idx_holiday_cals_site_id').on(table.siteId),
  })
);

export const holidays = pgTable(
  'holidays',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    calendarId: varchar('calendar_id', { length: 36 })
      .notNull()
      .references(() => holidayCalendars.id, { onDelete: 'cascade' }),
    date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
    name: varchar('name', { length: 128 }).notNull(),
    isNational: boolean('is_national').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    calDateIdx: uniqueIndex('idx_holidays_cal_date').on(table.calendarId, table.date),
  })
);

export const schedules = pgTable(
  'schedules',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    siteId: varchar('site_id', { length: 36 })
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    holidayCalendarId: varchar('holiday_calendar_id', { length: 36 }).references(
      () => holidayCalendars.id
    ),
    holidayBehavior: varchar('holiday_behavior', { length: 32 }).notNull().default('block_all'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    siteIdIdx: index('idx_schedules_site_id').on(table.siteId),
  })
);

export const scheduleWindows = pgTable(
  'schedule_windows',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    scheduleId: varchar('schedule_id', { length: 36 })
      .notNull()
      .references(() => schedules.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(), // 1=Mon..7=Sun
    startTime: varchar('start_time', { length: 5 }).notNull(), // "HH:MM"
    endTime: varchar('end_time', { length: 5 }).notNull(), // "HH:MM"
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    schedIdIdx: index('idx_sched_windows_sched_id').on(table.scheduleId),
  })
);

export const accessLevels = pgTable(
  'access_levels',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    siteId: varchar('site_id', { length: 36 })
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    description: varchar('description', { length: 256 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    siteIdIdx: index('idx_access_levels_site_id').on(table.siteId),
  })
);

export const accessLevelEntries = pgTable(
  'access_level_entries',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    accessLevelId: varchar('access_level_id', { length: 36 })
      .notNull()
      .references(() => accessLevels.id, { onDelete: 'cascade' }),
    doorId: varchar('door_id', { length: 36 })
      .notNull()
      .references(() => doors.id, { onDelete: 'cascade' }),
    scheduleId: varchar('schedule_id', { length: 36 })
      .notNull()
      .references(() => schedules.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    alDoorIdx: uniqueIndex('idx_al_entries_al_door').on(table.accessLevelId, table.doorId),
  })
);

export const groups = pgTable(
  'groups',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    siteId: varchar('site_id', { length: 36 })
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    description: varchar('description', { length: 256 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    siteIdIdx: index('idx_groups_site_id').on(table.siteId),
  })
);

export const groupAccessLevels = pgTable(
  'group_access_levels',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    groupId: varchar('group_id', { length: 36 })
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    accessLevelId: varchar('access_level_id', { length: 36 })
      .notNull()
      .references(() => accessLevels.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    groupAlIdx: uniqueIndex('idx_group_al_group_al').on(table.groupId, table.accessLevelId),
  })
);

export const personGroupAssignments = pgTable(
  'person_group_assignments',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    personId: varchar('person_id', { length: 36 })
      .notNull()
      .references(() => persons.id, { onDelete: 'cascade' }),
    groupId: varchar('group_id', { length: 36 })
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    validFrom: timestamp('valid_from').notNull(),
    validUntil: timestamp('valid_until'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    personGroupIdx: index('idx_person_groups_person_id').on(table.personId),
    validityIdx: index('idx_person_groups_validity').on(table.validFrom, table.validUntil),
  })
);
