import { db } from '@/server/db'
import { teams, pendingInvites, teamMembers } from '@/server/db/schema'
import { and, eq, gt, isNull } from 'drizzle-orm'
import type { Result } from '@/types'

export async function getTeamById(teamId: string): Promise<Result<typeof teams.$inferSelect>> {
  try {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    })
    if (!team) return { data: null, error: { message: 'Team not found', code: 'NOT_FOUND' } }
    return { data: team, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}

/**
 * Validates an invite token against all three conditions:
 *   usedAt IS NULL AND isRevoked = false AND expiresAt > now()
 *
 * If the invite is invalid, a second query determines the specific reason
 * so the caller can render a precise error message to the user.
 *
 * All errors returned as Result<T> — never throws.
 */
export async function validateInviteToken(
  token: string
): Promise<Result<typeof pendingInvites.$inferSelect>> {
  try {
    const invite = await db.query.pendingInvites.findFirst({
      where: and(
        eq(pendingInvites.token, token),
        isNull(pendingInvites.usedAt),
        eq(pendingInvites.isRevoked, false),
        gt(pendingInvites.expiresAt, new Date()),
      ),
    })

    if (!invite) {
      // Determine the specific reason for failure
      const anyInvite = await db.query.pendingInvites.findFirst({
        where: eq(pendingInvites.token, token),
      })
      if (!anyInvite) {
        return { data: null, error: { message: 'Invite not found', code: 'INVITE_NOT_FOUND' } }
      }
      if (anyInvite.isRevoked) {
        return { data: null, error: { message: 'This invite has been revoked', code: 'INVITE_REVOKED' } }
      }
      if (anyInvite.usedAt) {
        return { data: null, error: { message: 'This invite has already been used', code: 'INVITE_USED' } }
      }
      return { data: null, error: { message: 'This invite has expired', code: 'INVITE_EXPIRED' } }
    }

    return { data: invite, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}

/**
 * Inserts a new team_members row.
 * ON CONFLICT DO NOTHING — idempotent: safe to call twice for the same (teamId, userId) pair.
 */
export async function addTeamMember(
  teamId: string,
  userId: string,
  role: string
): Promise<Result<void>> {
  try {
    await db
      .insert(teamMembers)
      .values({ teamId, userId, role, joinedAt: new Date() })
      .onConflictDoNothing()
    return { data: undefined, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
