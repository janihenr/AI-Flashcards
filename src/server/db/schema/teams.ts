import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core'
import { profiles } from './users'
import { decks } from './decks'

export const teams = pgTable('teams', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),
  ownerId:   uuid('owner_id').notNull().references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// team_members — join table; unique per (userId, teamId)
export const teamMembers = pgTable('team_members', {
  id:       uuid('id').primaryKey().defaultRandom(),
  teamId:   uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId:   uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  role:     text('role').notNull(), // 'team_member' | 'team_admin'
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.teamId, t.userId),
  index('idx_team_members_team').on(t.teamId),
  index('idx_team_members_user').on(t.userId),
])

// pending_invites — team email invitations
export const pendingInvites = pgTable('pending_invites', {
  id:        uuid('id').primaryKey().defaultRandom(),
  teamId:    uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  email:     text('email').notNull(),
  token:     text('token').notNull().unique(),
  role:      text('role').notNull().default('team_member'),
  isRevoked: boolean('is_revoked').notNull().default(false), // E2: required for admin invite revocation
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  usedAt:    timestamp('used_at', { withTimezone: true }), // null = pending; set on accept (one-time use)
}, (t) => [
  unique().on(t.teamId, t.email),
])
// Invite valid only if: usedAt IS NULL AND isRevoked = false AND expiresAt > now()

// team_deck_assignments — decks assigned to specific team members
export const teamDeckAssignments = pgTable('team_deck_assignments', {
  id:         uuid('id').primaryKey().defaultRandom(),
  teamId:     uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  deckId:     uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  userId:     uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.teamId, t.deckId, t.userId),
])
