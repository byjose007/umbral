import {
  pgTable,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sites } from './topology.js';

export const operatorRoleEnum = pgEnum('operator_role', [
  'admin',
  'supervisor',
  'guardia',
  'auditor',
]);

export const operatorStatusEnum = pgEnum('operator_status', [
  'active',
  'disabled',
]);

export const operators = pgTable(
  'operators',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    siteId: varchar('site_id', { length: 36 })
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    organizationId: varchar('organization_id', { length: 36 }),
    fullName: varchar('full_name', { length: 128 }).notNull(),
    email: varchar('email', { length: 256 }).notNull(),
    passwordHash: varchar('password_hash', { length: 256 }).notNull(),
    role: operatorRoleEnum('role').notNull(),
    status: operatorStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastLoginAt: timestamp('last_login_at'),
    assignedReaderId: varchar('assigned_reader_id', { length: 36 }),
  },
  (table) => ({
    emailIdx: uniqueIndex('idx_operators_email').on(table.email),
    siteIdIdx: index('idx_operators_site_id').on(table.siteId),
  }),
);

/**
 * Refresh tokens are stored hashed (never the raw token) and rotated on every
 * use: a successful refresh revokes the current row and inserts a new one.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    operatorId: varchar('operator_id', { length: 36 })
      .notNull()
      .references(() => operators.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    operatorIdIdx: index('idx_refresh_tokens_operator_id').on(table.operatorId),
    tokenHashIdx: uniqueIndex('idx_refresh_tokens_token_hash').on(table.tokenHash),
  }),
);
