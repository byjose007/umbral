import { pgTable, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { index } from 'drizzle-orm/pg-core';
import { sites } from './topology.js';
import { persons } from './identity.js';
import { accessLevels } from './access-rights.js';

export const accessRequests = pgTable(
  'access_requests',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    siteId: varchar('site_id', { length: 36 })
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    applicantType: varchar('applicant_type', { length: 16 }).notNull(),
    applicantName: varchar('applicant_name', { length: 128 }).notNull(),
    applicantDocumentNumber: varchar('applicant_document_number', { length: 64 }),
    applicantPersonId: varchar('applicant_person_id', { length: 36 }).references(() => persons.id),
    requestedAccessLevelId: varchar('requested_access_level_id', { length: 36 })
      .notNull()
      .references(() => accessLevels.id),
    reason: varchar('reason', { length: 512 }).notNull(),
    validFrom: timestamp('valid_from').notNull(),
    validUntil: timestamp('valid_until').notNull(),
    requiredDocumentTypes: jsonb('required_document_types').notNull().default('[]'),
    status: varchar('status', { length: 32 }).notNull().default('requested'),
    decidedBy: varchar('decided_by', { length: 128 }),
    decidedAt: timestamp('decided_at'),
    decisionReason: varchar('decision_reason', { length: 512 }),
    history: jsonb('history').notNull().default('[]'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    siteIdIdx: index('idx_access_requests_site_id').on(table.siteId),
    statusIdx: index('idx_access_requests_status').on(table.status),
  })
);
