import {
  pgTable,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sites, doors, controllers } from './topology.js';
import { persons } from './identity.js';

export const accessEvents = pgTable(
  'access_events',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    chainPartition: varchar('chain_partition', { length: 64 }).notNull(),
    sequenceNumber: integer('sequence_number').notNull(),
    previousHash: varchar('previous_hash', { length: 64 }).notNull(),
    currentHash: varchar('current_hash', { length: 64 }).notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    severity: varchar('severity', { length: 32 }).notNull().default('info'),
    siteId: varchar('site_id', { length: 36 })
      .notNull()
      .references(() => sites.id),
    doorId: varchar('door_id', { length: 36 }).references(() => doors.id),
    controllerId: varchar('controller_id', { length: 36 }).references(
      () => controllers.id,
    ),
    personId: varchar('person_id', { length: 36 }).references(() => persons.id),
    credentialId: varchar('credential_id', { length: 36 }),
    direction: varchar('direction', { length: 16 }), // in, out
    reasonCode: varchar('reason_code', { length: 64 }),
    details: jsonb('details').notNull(),
    timestamp: timestamp('timestamp').notNull(),
  },
  (table) => ({
    partitionSeqIdx: uniqueIndex('idx_events_partition_seq').on(
      table.chainPartition,
      table.sequenceNumber,
    ),
    timestampIdx: index('idx_events_timestamp').on(table.timestamp),
    doorIdIdx: index('idx_events_door_id').on(table.doorId),
    personIdIdx: index('idx_events_person_id').on(table.personId),
  }),
);
