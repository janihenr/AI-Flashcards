import {
  pgTable,
  uuid,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { cards, cardModeEnum } from './cards'
import { profiles } from './users'

export const reviews = pgTable('reviews', {
  id:               uuid('id').primaryKey().defaultRandom(),
  cardId:           uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  userId:           uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  rating:           integer('rating').notNull(),            // FSRS Rating: Again=1, Hard=2, Good=3, Easy=4
  // nullable — anonymous sessions omit behavioral signals (GDPR legitimate interest basis)
  presentationMode: cardModeEnum('presentation_mode'),
  responseTimeMs:   integer('response_time_ms'),  // elapsed ms from card display to rating tap; null for anonymous
  reviewedAt:       timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_reviews_user_reviewed_at').on(t.userId, t.reviewedAt),
])
