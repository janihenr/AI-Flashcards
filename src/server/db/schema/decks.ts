import {
  pgTable,
  uuid,
  text,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core'
import { profiles } from './users'

export const decks = pgTable('decks', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title:     text('title').notNull(),
  subject:   text('subject'),
  shareToken: text('share_token').unique(), // URL-safe random token; null = not shared
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_decks_user_deleted').on(t.userId, t.deletedAt),
])

// deck_shares — shared deck access control
export const deckShares = pgTable('deck_shares', {
  id:        uuid('id').primaryKey().defaultRandom(),
  deckId:    uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.deckId, t.userId),
])
