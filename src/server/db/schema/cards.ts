import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core'
// C3: notes is co-located in decks.ts — import from './decks', NOT './notes'
import { notes } from './decks'
import { profiles } from './users'

export const cardModeEnum = pgEnum('card_mode', ['qa', 'image', 'context-narrative'])
// CardMode TS type lives in src/types/index.ts — NEVER redefine it here

export const cards = pgTable('cards', {
  id:               uuid('id').primaryKey().defaultRandom(),
  noteId:           uuid('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  userId:           uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  mode:             cardModeEnum('mode').notNull().default('qa'),

  // Card content — mode-specific fields are nullable
  frontContent:     text('front_content').notNull(),
  backContent:      text('back_content').notNull(),
  narrativeContext: text('narrative_context'), // non-null only when mode = 'context-narrative'
  imageUrl:         text('image_url'),          // non-null only when mode = 'image'

  // FSRS-6 scheduling state (managed by ts-fsrs — do NOT install ts-fsrs in this story)
  stability:     real('stability').notNull().default(0),
  difficulty:    real('difficulty').notNull().default(0),
  elapsedDays:   integer('elapsed_days').notNull().default(0),
  scheduledDays: integer('scheduled_days').notNull().default(0),
  reps:          integer('reps').notNull().default(0),
  lapses:        integer('lapses').notNull().default(0),
  state:         integer('state').notNull().default(0), // FSRS State: New=0, Learning=1, Review=2, Relearning=3
  due:           timestamp('due', { withTimezone: true }).notNull().defaultNow(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_cards_user_due').on(t.userId, t.due),
])
