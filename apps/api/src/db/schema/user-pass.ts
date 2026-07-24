import {
  pgTable,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { persons } from './identity.js';

/**
 * Stores the encrypted offline seed for each person's User Pass PWA.
 * A seed is provisioned on first login and can be rotated.
 * The seed is used client-side by WebCrypto to derive HMAC tokens
 * without any server round-trip — enabling basement/garage offline use.
 */
export const userPassSeeds = pgTable(
  'user_pass_seeds',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    personId: varchar('person_id', { length: 36 })
      .notNull()
      .unique()
      .references(() => persons.id, { onDelete: 'cascade' }),
    /** AES-GCM encrypted seed — decryption key is derived from user's PIN+salt client-side */
    encryptedSeed: varchar('encrypted_seed', { length: 512 }).notNull(),
    /** Salt used for PIN-based key derivation (PBKDF2) — stored alongside encrypted seed */
    salt: varchar('salt', { length: 64 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    issuedAt: timestamp('issued_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at'),
  },
  (table) => ({
    personIdIdx: index('idx_user_pass_seeds_person_id').on(table.personId),
  }),
);

export const accessEventTypeEnum = pgEnum('access_event_type', [
  'ENTRY',
  'EXIT',
  'DENIED',
  'DURESS',
]);

/**
 * Personal access history for each user — mirrors the events-audit hypertable
 * but provides a user-scoped, privacy-respecting view optimised for the mobile PWA.
 * Stores the user's own door access attempts (granted & denied) and duress triggers.
 */
export const userAccessHistory = pgTable(
  'user_access_history',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    personId: varchar('person_id', { length: 36 })
      .notNull()
      .references(() => persons.id, { onDelete: 'cascade' }),
    doorLabel: varchar('door_label', { length: 128 }).notNull(),
    eventType: accessEventTypeEnum('event_type').notNull(),
    granted: boolean('granted').notNull(),
    isDuress: boolean('is_duress').notNull().default(false),
    occurredAt: timestamp('occurred_at').notNull(),
  },
  (table) => ({
    personIdIdx: index('idx_user_access_history_person_id').on(table.personId),
    occurredAtIdx: index('idx_user_access_history_occurred_at').on(
      table.occurredAt,
    ),
  }),
);

/**
 * Visitor passes issued by users from the mobile PWA.
 * Each pass is a time-limited, use-limited guest credential shareable via WhatsApp/Email.
 */
export const userVisitorPasses = pgTable(
  'user_visitor_passes',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    issuerPersonId: varchar('issuer_person_id', { length: 36 })
      .notNull()
      .references(() => persons.id, { onDelete: 'cascade' }),
    visitorName: varchar('visitor_name', { length: 128 }).notNull(),
    visitorEmail: varchar('visitor_email', { length: 256 }),
    validFrom: timestamp('valid_from').notNull(),
    validTo: timestamp('valid_to').notNull(),
    maxUses: integer('max_uses').notNull().default(1),
    usedCount: integer('used_count').notNull().default(0),
    signedQrToken: varchar('signed_qr_token', { length: 512 }).notNull(),
    shareUrl: varchar('share_url', { length: 512 }),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    issuerIdx: index('idx_user_visitor_passes_issuer').on(table.issuerPersonId),
    validToIdx: index('idx_user_visitor_passes_valid_to').on(table.validTo),
  }),
);
