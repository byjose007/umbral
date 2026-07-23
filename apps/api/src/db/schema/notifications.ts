import {
  pgTable,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const notificationLogs = pgTable(
  'notification_logs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    alertId: varchar('alert_id', { length: 36 }).notNull(),
    channel: varchar('channel', { length: 32 }).notNull(),
    recipientRole: varchar('recipient_role', { length: 64 }).notNull(),
    recipientTarget: varchar('recipient_target', { length: 128 }).notNull(),
    locale: varchar('locale', { length: 8 }).notNull().default('es'),
    templateId: varchar('template_id', { length: 64 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
    status: varchar('status', { length: 32 }).notNull().default('queued'),
    retryCount: integer('retry_count').notNull().default(0),
    errorDetails: varchar('error_details', { length: 255 }),
    payload: jsonb('payload'),
    sentAt: timestamp('sent_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    alertIdIdx: index('idx_notification_logs_alert_id').on(table.alertId),
    idempotencyIdx: index('idx_notification_logs_idempotency').on(table.idempotencyKey),
    statusIdx: index('idx_notification_logs_status').on(table.status),
  })
);
