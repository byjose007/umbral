import {
  pgTable,
  varchar,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { controllers } from './topology.js';

export const deviceProvisioning = pgTable(
  'device_provisioning',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    controllerId: varchar('controller_id', { length: 36 })
      .notNull()
      .references(() => controllers.id, { onDelete: 'cascade' }),
    certificateThumbprint: varchar('certificate_thumbprint', { length: 128 }).notNull().unique(),
    status: varchar('status', { length: 32 }).notNull().default('active'), // active, revoked
    provisionedAt: timestamp('provisioned_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at'),
  },
  (table) => ({
    controllerIdIdx: uniqueIndex('idx_dev_prov_ctrl_id').on(table.controllerId),
    thumbprintIdx: uniqueIndex('idx_dev_prov_thumbprint').on(table.certificateThumbprint),
  })
);

export const receivedEventDedup = pgTable(
  'received_event_dedup',
  {
    eventId: varchar('event_id', { length: 64 }).primaryKey(),
    controllerId: varchar('controller_id', { length: 36 }).notNull(),
    receivedAt: timestamp('received_at').defaultNow().notNull(),
  },
  (table) => ({
    controllerIdIdx: index('idx_event_dedup_ctrl_id').on(table.controllerId),
  })
);

export const deviceHealthLogs = pgTable(
  'device_health_logs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    controllerId: varchar('controller_id', { length: 36 })
      .notNull()
      .references(() => controllers.id, { onDelete: 'cascade' }),
    appliedMatrixVersion: integer('applied_matrix_version').notNull().default(0),
    firmwareVersion: varchar('firmware_version', { length: 64 }).notNull().default('1.0.0'),
    batteryStatus: varchar('battery_status', { length: 32 }).notNull().default('ok'),
    tamperState: boolean('tamper_state').notNull().default(false),
    clockDriftMs: integer('clock_drift_ms').notNull().default(0),
    lastHeartbeatAt: timestamp('last_heartbeat_at').defaultNow().notNull(),
  },
  (table) => ({
    controllerIdIdx: uniqueIndex('idx_health_logs_ctrl_id').on(table.controllerId),
  })
);
