import {
  pgTable,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { persons } from './identity.js';

export const credentials = pgTable(
  'credentials',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    personId: varchar('person_id', { length: 36 })
      .notNull()
      .references(() => persons.id, { onDelete: 'cascade' }),
    credentialType: varchar('credential_type', { length: 32 }).notNull(),
    credentialHash: varchar('credential_hash', { length: 128 }).notNull().unique(),
    pinHash: varchar('pin_hash', { length: 128 }),
    duressPinHash: varchar('duress_pin_hash', { length: 128 }),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    blockReason: varchar('block_reason', { length: 256 }),
    blockedAt: timestamp('blocked_at'),
    validFrom: timestamp('valid_from').notNull(),
    validUntil: timestamp('valid_until'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    personIdIdx: index('idx_credentials_person_id').on(table.personId),
    credentialHashIdx: uniqueIndex('idx_credentials_hash').on(table.credentialHash),
    statusIdx: index('idx_credentials_status').on(table.status),
  })
);
