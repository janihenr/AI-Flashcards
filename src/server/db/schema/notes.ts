import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { decks } from './decks'
import { profiles } from './users'

export const notes = pgTable('notes', {
  id:        uuid('id').primaryKey().defaultRandom(),
  deckId:    uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  content:   text('content').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
