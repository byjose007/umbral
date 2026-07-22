import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  check,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { sites } from './topology.js';

export const persons = pgTable(
  'persons',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    siteId: varchar('site_id', { length: 36 })
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    personType: varchar('person_type', { length: 32 }).notNull(), // employee, contractor, visitor
    firstName: varchar('first_name', { length: 128 }).notNull(),
    lastName: varchar('last_name', { length: 128 }).notNull(),
    nationalId: varchar('national_id', { length: 64 }).notNull(),
    externalRef: varchar('external_ref', { length: 128 }),
    email: varchar('email', { length: 256 }),
    phone: varchar('phone', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    siteNationalIdIdx: uniqueIndex('idx_persons_site_national_id').on(table.siteId, table.nationalId),
    externalRefIdx: index('idx_persons_external_ref').on(table.externalRef),
  })
);

export const employmentPeriods = pgTable(
  'employment_periods',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    personId: varchar('person_id', { length: 36 })
      .notNull()
      .references(() => persons.id, { onDelete: 'cascade' }),
    contractType: varchar('contract_type', { length: 32 }).notNull().default('full_time'),
    validFrom: timestamp('valid_from').notNull(),
    validUntil: timestamp('valid_until'),
    jobTitle: varchar('job_title', { length: 128 }),
    department: varchar('department', { length: 128 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    personIdIdx: index('idx_emp_periods_person_id').on(table.personId),
    chkEmpDates: check(
      'chk_emp_dates',
      sql`valid_until IS NULL OR valid_until >= valid_from`
    ),
  })
);

export const absences = pgTable(
  'absences',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    personId: varchar('person_id', { length: 36 })
      .notNull()
      .references(() => persons.id, { onDelete: 'cascade' }),
    absenceType: varchar('absence_type', { length: 32 }).notNull(), // vacation, leave, medical, suspension
    validFrom: timestamp('valid_from').notNull(),
    validUntil: timestamp('valid_until').notNull(),
    blocksAccess: boolean('blocks_access').notNull().default(true),
    reason: varchar('reason', { length: 256 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    personIdIdx: index('idx_absences_person_id').on(table.personId),
    chkAbsenceDates: check(
      'chk_absence_dates',
      sql`valid_until >= valid_from`
    ),
  })
);

export const personDocuments = pgTable(
  'person_documents',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    personId: varchar('person_id', { length: 36 })
      .notNull()
      .references(() => persons.id, { onDelete: 'cascade' }),
    docType: varchar('doc_type', { length: 32 }).notNull(), // safety_cert, medical_exam, insurance_policy, id_card
    documentNumber: varchar('document_number', { length: 128 }).notNull(),
    expiresAt: timestamp('expires_at'),
    blocksAccessOnExpiry: boolean('blocks_access_on_expiry').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    personIdIdx: index('idx_person_docs_person_id').on(table.personId),
    expiresAtIdx: index('idx_person_docs_expires_at').on(table.expiresAt),
  })
);
