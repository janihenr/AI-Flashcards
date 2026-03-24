import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'

export const dataExportJobs = pgTable('data_export_jobs', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull(),
  // No FK reference to auth.users — auth schema not reachable from Drizzle; enforced in SQL migration
  status:       text('status').notNull().default('pending'),
  // 'pending' | 'processing' | 'ready' | 'failed' | 'expired'
  filePath:     text('file_path'),       // storage path: '{userId}/{jobId}.json'
  expiresAt:    timestamp('expires_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_export_jobs_user_status').on(t.userId, t.status),
])

export type DataExportJobRow = typeof dataExportJobs.$inferSelect
