import {
  pgTable,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  check,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const sites = pgTable(
  'sites',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    code: varchar('code', { length: 32 }).notNull().unique(),
    name: varchar('name', { length: 128 }).notNull(),
    timezone: varchar('timezone', { length: 64 }).notNull().default('America/Guayaquil'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
);

export const zones = pgTable(
  'zones',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    siteId: varchar('site_id', { length: 36 })
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    parentId: varchar('parent_id', { length: 36 }),
    code: varchar('code', { length: 32 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    siteCodeIdx: uniqueIndex('idx_zones_site_code').on(table.siteId, table.code),
  })
);

export const lockProfiles = pgTable(
  'lock_profiles',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    actuationMode: varchar('actuation_mode', { length: 32 }).notNull(), // pulse, maintained, toggle
    pulseDurationMs: integer('pulse_duration_ms').notNull().default(3000),
    unlockWindowMs: integer('unlock_window_ms'),
    failState: varchar('fail_state', { length: 32 }).notNull(), // fail_safe, fail_secure
    relayInverted: boolean('relay_inverted').notNull().default(false),
    hasDps: boolean('has_dps').notNull().default(true),
    hasRex: boolean('has_rex').notNull().default(true),
    hasTamper: boolean('has_tamper').notNull().default(true),
    heldOpenTimeoutSec: integer('held_open_timeout_sec'),
    heldOpenPrewarnSec: integer('held_open_prewarn_sec'),
    rexGraceSec: integer('rex_grace_sec').notNull().default(8),
    isEgressRoute: boolean('is_egress_route').notNull().default(false),
    releasesOnFire: boolean('releases_on_fire').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    chkEgressFailsafe: check(
      'chk_egress_failsafe',
      sql`NOT is_egress_route OR fail_state = 'fail_safe'`
    ),
    chkEgressFireRelease: check(
      'chk_egress_fire_release',
      sql`NOT is_egress_route OR releases_on_fire`
    ),
    chkDhoNeedsSensor: check(
      'chk_dho_needs_sensor',
      sql`has_dps OR held_open_timeout_sec IS NULL`
    ),
  })
);

export const controllers = pgTable(
  'controllers',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    siteId: varchar('site_id', { length: 36 })
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    ipAddress: varchar('ip_address', { length: 64 }).notNull(),
    model: varchar('model', { length: 64 }).notNull().default('Simulator'),
    serialNumber: varchar('serial_number', { length: 64 }).notNull().default('SIM-001'),
    status: varchar('status', { length: 32 }).notNull().default('online'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
);

export const doors = pgTable(
  'doors',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    siteId: varchar('site_id', { length: 36 })
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    controllerId: varchar('controller_id', { length: 36 })
      .notNull()
      .references(() => controllers.id, { onDelete: 'cascade' }),
    lockProfileId: varchar('lock_profile_id', { length: 36 })
      .notNull()
      .references(() => lockProfiles.id),
    zoneInsideId: varchar('zone_inside_id', { length: 36 })
      .notNull()
      .references(() => zones.id),
    zoneOutsideId: varchar('zone_outside_id', { length: 36 }).references(() => zones.id),
    name: varchar('name', { length: 128 }).notNull(),
    dpsSupervised: boolean('dps_supervised').notNull().default(false),
    rexSupervised: boolean('rex_supervised').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
);

export const readers = pgTable(
  'readers',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    doorId: varchar('door_id', { length: 36 })
      .notNull()
      .references(() => doors.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    protocol: varchar('protocol', { length: 32 }).notNull(), // osdp, wiegand
    direction: varchar('direction', { length: 16 }).notNull().default('in'),
    riskAcceptedBy: varchar('risk_accepted_by', { length: 128 }),
    riskAcceptedAt: timestamp('risk_accepted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    chkWiegandRisk: check(
      'chk_wiegand_risk',
      sql`protocol <> 'wiegand' OR risk_accepted_by IS NOT NULL`
    ),
  })
);

export const topologyConfigVersions = pgTable(
  'topology_config_versions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    versionNumber: integer('version_number').notNull(),
    entityType: varchar('entity_type', { length: 64 }).notNull(),
    entityId: varchar('entity_id', { length: 36 }).notNull(),
    changedBy: varchar('changed_by', { length: 128 }).notNull(),
    approvedBy: varchar('approved_by', { length: 128 }),
    reason: varchar('reason', { length: 256 }).notNull(),
    requiresDualApproval: boolean('requires_dual_approval').notNull().default(false),
    status: varchar('status', { length: 32 }).notNull().default('applied'), // pending_approval, approved, applied, rejected
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  }
);
