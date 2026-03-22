// Drizzle ORM 0.45.x relations — centralized in one file
// Note: defineRelations (v2 API) is only in beta. Using stable relations() function.
import { relations } from 'drizzle-orm'
import {
  profiles, aiUsage, analyticsEvents,
  decks, notes, deckShares,
  cards, reviews,
  teams, teamMembers, pendingInvites, teamDeckAssignments,
} from './schema'

export const profilesRelations = relations(profiles, ({ many }) => ({
  decks: many(decks),
  notes: many(notes),
  deckShares: many(deckShares),
  cards: many(cards),
  reviews: many(reviews),
  teamMembers: many(teamMembers),
  ownedTeams: many(teams),
  aiUsage: many(aiUsage),
  analyticsEvents: many(analyticsEvents),
}))

export const decksRelations = relations(decks, ({ one, many }) => ({
  owner: one(profiles, { fields: [decks.userId], references: [profiles.id] }),
  notes: many(notes),
  deckShares: many(deckShares),
  teamDeckAssignments: many(teamDeckAssignments),
}))

export const notesRelations = relations(notes, ({ one, many }) => ({
  deck: one(decks, { fields: [notes.deckId], references: [decks.id] }),
  owner: one(profiles, { fields: [notes.userId], references: [profiles.id] }),
  cards: many(cards),
}))

export const deckSharesRelations = relations(deckShares, ({ one }) => ({
  deck: one(decks, { fields: [deckShares.deckId], references: [decks.id] }),
  user: one(profiles, { fields: [deckShares.userId], references: [profiles.id] }),
}))

export const cardsRelations = relations(cards, ({ one, many }) => ({
  note: one(notes, { fields: [cards.noteId], references: [notes.id] }),
  owner: one(profiles, { fields: [cards.userId], references: [profiles.id] }),
  reviews: many(reviews),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
  card: one(cards, { fields: [reviews.cardId], references: [cards.id] }),
  user: one(profiles, { fields: [reviews.userId], references: [profiles.id] }),
}))

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(profiles, { fields: [teams.ownerId], references: [profiles.id] }),
  teamMembers: many(teamMembers),
  pendingInvites: many(pendingInvites),
  teamDeckAssignments: many(teamDeckAssignments),
}))

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(profiles, { fields: [teamMembers.userId], references: [profiles.id] }),
}))

export const pendingInvitesRelations = relations(pendingInvites, ({ one }) => ({
  team: one(teams, { fields: [pendingInvites.teamId], references: [teams.id] }),
}))

export const teamDeckAssignmentsRelations = relations(teamDeckAssignments, ({ one }) => ({
  team: one(teams, { fields: [teamDeckAssignments.teamId], references: [teams.id] }),
  deck: one(decks, { fields: [teamDeckAssignments.deckId], references: [decks.id] }),
  user: one(profiles, { fields: [teamDeckAssignments.userId], references: [profiles.id] }),
}))

export const aiUsageRelations = relations(aiUsage, ({ one }) => ({
  user: one(profiles, { fields: [aiUsage.userId], references: [profiles.id] }),
}))

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(profiles, { fields: [analyticsEvents.userId], references: [profiles.id] }),
}))
