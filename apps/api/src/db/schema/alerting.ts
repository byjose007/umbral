import {
  pgTable,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sites, doors } from './topology.js';

export const alertRules = pgTable(
  'alert_rules',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    siteId: varchar('site_id', { length: 36 })
      .notNull()
      .references(() => sites.id),
    name: varchar('name', { length: 128 }).notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    severity: varchar('severity', { length: 32 }).notNull().default('warning'),
    dedupWindowSec: integer('dedup_window_sec').notNull().default(60),
    escalationSec: integer('escalation_sec'),
    preAlarmSec: integer('pre_alarm_sec'),
    channels: jsonb('channels').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    siteIdIdx: index('idx_rules_site_id').on(table.siteId),
  }),
);

export const alerts = pgTable(
  'alerts',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    ruleId: varchar('rule_id', { length: 36 }).references(() => alertRules.id),
    siteId: varchar('site_id', { length: 36 })
      .notNull()
      .references(() => sites.id),
    doorId: varchar('door_id', { length: 36 }).references(() => doors.id),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    severity: varchar('severity', { length: 32 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('active'), // active, acknowledged, escalated, cleared
    acknowledgedBy: varchar('acknowledged_by', { length: 128 }),
    acknowledgedAt: timestamp('acknowledged_at'),
    pseudonymizedPersonId: varchar('pseudonymized_person_id', { length: 64 }),
    rawPersonId: varchar('raw_person_id', { length: 36 }),
    details: jsonb('details').notNull(),
    timestamp: timestamp('timestamp').notNull(),
  },
  (table) => ({
    siteIdIdx: index('idx_alerts_site_id').on(table.siteId),
    statusIdx: index('idx_alerts_status').on(table.status),
  }),
);

export const alertPiiAuditLogs = pgTable(
  'alert_pii_audit_logs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    alertId: varchar('alert_id', { length: 36 })
      .notNull()
      .references(() => alerts.id),
    operatorUser: varchar('operator_user', { length: 128 }).notNull(),
    revealedPersonId: varchar('revealed_person_id', { length: 36 }).notNull(),
    revealedAt: timestamp('revealed_at').defaultNow().notNull(),
  },
  (table) => ({
    alertIdIdx: index('idx_pii_audit_alert_id').on(table.alertId),
  }),
);
