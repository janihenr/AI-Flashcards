import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  date,
  integer,
  unique,
  index,
} from 'drizzle-orm/pg-core'

export const profiles = pgTable('profiles', {
  // C4: NO .references() — Drizzle cannot reference auth.users (Supabase internal schema).
  // FK is enforced by Supabase via trigger. Do NOT add .references() here.
  id:               uuid('id').primaryKey(),
  displayName:      text('display_name'),
  tier:             text('tier').notNull().default('free'),       // 'anonymous'|'free'|'pro'|'team_member'|'team_admin'
  previousTier:     text('previous_tier'),                        // nullable — stores tier before team join
  isAdmin:          boolean('is_admin').notNull().default(false),
  formatPreferences: jsonb('format_preferences'),                  // FormatPreferences | null (Layer 2)
  userFsrsParams:   jsonb('user_fsrs_params'),                    // number[21] | null (Layer 1 — ts-fsrs managed)
  gdprConsentAt:    timestamp('gdpr_consent_at', { withTimezone: true }),
  deletedAt:        timestamp('deleted_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// system_config — singleton table (one row; id = 'global')
export const systemConfig = pgTable('system_config', {
  id:               text('id').primaryKey().default('global'),
  // O1: Column name intentionally has 3 e's to match architecture canonical schema
  aiFreeeTierEnabled: boolean('ai_free_tier_enabled').notNull().default(true),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy:        uuid('updated_by').references(() => profiles.id),
})

// ai_usage — per-user monthly AI generation counter
export const aiUsage = pgTable('ai_usage', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  // E4: Use monthStart (date), NOT reset_at — architecture prose is inconsistent but canonical schema is correct
  monthStart: date('month_start').notNull(),
  count:      integer('count').notNull().default(0),
}, (t) => [
  unique().on(t.userId, t.monthStart),
])

// anonymous_sessions — tracks cold-start anonymous sessions for GDPR cleanup
export const anonymousSessions = pgTable('anonymous_sessions', {
  id:             uuid('id').primaryKey().defaultRandom(),
  supabaseAnonId: uuid('supabase_anon_id').notNull().unique(), // auth.uid() of anonymous Supabase user
  linkedAt:       timestamp('linked_at', { withTimezone: true }), // null = unconverted; set on linkIdentity()
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// processed_webhook_events — Stripe idempotency guard
export const processedWebhookEvents = pgTable('processed_webhook_events', {
  id:          uuid('id').primaryKey().defaultRandom(),
  webhookId:   text('webhook_id').notNull().unique(), // Stripe event.id
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
})

// analytics_events — product event log
export const analyticsEvents = pgTable('analytics_events', {
  id:        uuid('id').primaryKey().defaultRandom(),
  eventName: text('event_name').notNull(),
  userId:    uuid('user_id').references(() => profiles.id), // null for anonymous events
  metadata:  jsonb('metadata'),                              // event-specific payload (no PII)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_analytics_events_name_created').on(t.eventName, t.createdAt),
  index('idx_analytics_events_user').on(t.userId, t.createdAt),
])
