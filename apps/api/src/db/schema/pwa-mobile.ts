import {
  pgTable,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { persons } from './identity.js';
import { sites } from './topology.js';

export const mobilePasses = pgTable(
  'mobile_passes',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    personId: varchar('person_id', { length: 36 })
      .notNull()
      .references(() => persons.id, { onDelete: 'cascade' }),
    seedSecret: varchar('seed_secret', { length: 128 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    issuedAt: timestamp('issued_at').defaultNow().notNull(),
  },
  (table) => ({
    personIdIdx: index('idx_mobile_passes_person_id').on(table.personId),
  }),
);

export const visitorPasses = pgTable(
  'visitor_passes',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    issuerPersonId: varchar('issuer_person_id', { length: 36 })
      .notNull()
      .references(() => persons.id),
    visitorName: varchar('visitor_name', { length: 128 }).notNull(),
    visitorDocument: varchar('visitor_document', { length: 64 }),
    validFrom: timestamp('valid_from').notNull(),
    validTo: timestamp('valid_to').notNull(),
    maxUses: integer('max_uses').notNull().default(1),
    currentUses: integer('current_uses').notNull().default(0),
    signedQrToken: varchar('signed_qr_token', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    issuerIdx: index('idx_visitor_passes_issuer').on(table.issuerPersonId),
  }),
);

export const musterSnapshots = pgTable(
  'muster_snapshots',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    siteId: varchar('site_id', { length: 36 })
      .notNull()
      .references(() => sites.id),
    initiatedBy: varchar('initiated_by', { length: 128 }).notNull(),
    initiatedAt: timestamp('initiated_at').defaultNow().notNull(),
    occupantsSnapshot: jsonb('occupants_snapshot').notNull(),
    totalInside: integer('total_inside').notNull(),
    evacuatedCount: integer('evacuated_count').notNull().default(0),
  },
  (table) => ({
    siteIdIdx: index('idx_muster_site_id').on(table.siteId),
  }),
);

export const guardOverrideLogs = pgTable(
  'guard_override_logs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    guardPersonId: varchar('guard_person_id', { length: 36 }).notNull(),
    targetPersonId: varchar('target_person_id', { length: 36 }),
    targetDocument: varchar('target_document', { length: 64 }),
    doorId: varchar('door_id', { length: 36 }).notNull(),
    reason: varchar('reason', { length: 255 }).notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    guardIdx: index('idx_guard_override_guard_person').on(table.guardPersonId),
  }),
);
