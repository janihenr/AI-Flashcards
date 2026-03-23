'use server'
import { db, pendingInvites, teamMembers, profiles } from '@/server/db'
import { eq, sql } from 'drizzle-orm'
import { validateInviteToken } from '@/server/db/queries/teams'
import { getUserProfile, upsertProfile } from '@/server/db/queries/users'
import { createUserClient } from '@/lib/supabase/user'
import { log } from '@/lib/logger'
import type { Result } from '@/types'

const ALLOWED_ROLES = ['team_member', 'team_admin'] as const
type AllowedRole = typeof ALLOWED_ROLES[number]

/**
 * Accepts a team invite for the currently authenticated user.
 *
 * Security properties:
 * - userId derived from server-side session only — never accepted as a caller parameter
 * - Email match enforced: authenticated user's email MUST match the invite's target email
 * - Role validated against allow-list before any DB write
 * - SELECT FOR UPDATE inside transaction prevents concurrent double-acceptance
 * - previous_tier preserved via subquery (avoids SET-clause self-reference ambiguity in Postgres)
 *
 * Called from:
 *   - auth callback route (GET /api/auth/callback?invite_token=…) for OAuth/email-verify flows
 *   - invite page directly for already-authenticated users and email/password login flow
 */
export async function acceptTeamInvite(
  token: string
): Promise<Result<{ teamId: string }>> {
  const supabase = await createUserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } }
  }
  return _runInviteAcceptance(token, user.id, user.email)
}

/**
 * Signs in with email/password and immediately accepts the team invite.
 * Used from the invite page login form so the round-trip stays in one action.
 */
export async function signInAndAcceptInvite(
  token: string,
  email: string,
  password: string
): Promise<Result<{ redirectUrl: string }>> {
  const supabase = await createUserClient()
  const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !user) {
    return { data: null, error: { message: error?.message ?? 'Login failed', code: 'AUTH_ERROR' } }
  }

  const result = await _runInviteAcceptance(token, user.id, user.email)
  if (result.error) return { data: null, error: result.error }

  return { data: { redirectUrl: `/decks?team=${result.data.teamId}` }, error: null }
}

/**
 * Signs up with email/password via an invite link.
 * Sets emailRedirectTo to include the invite_token so the callback can call acceptTeamInvite
 * after the user verifies their email.
 */
export async function signUpForInvite(
  token: string,
  email: string,
  password: string,
  tosAccepted: boolean
): Promise<Result<{ message: string }>> {
  if (!tosAccepted) {
    return {
      data: null,
      error: { message: 'You must accept the Terms of Service to continue', code: 'TOS_NOT_ACCEPTED' },
    }
  }
  if (!email || !password || password.length < 8) {
    return { data: null, error: { message: 'Invalid email or password (minimum 8 characters)', code: 'VALIDATION_ERROR' } }
  }

  const supabase = await createUserClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    return { data: null, error: { message: 'App URL not configured', code: 'CONFIG_ERROR' } }
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/api/auth/callback?invite_token=${encodeURIComponent(token)}`,
    },
  })
  if (error) return { data: null, error: { message: error.message } }

  // Supabase silently succeeds for duplicate emails (empty identities) — return same message
  if (signUpData.user?.identities?.length === 0) {
    return { data: { message: 'Check your email to verify your account' }, error: null }
  }

  return { data: { message: 'Check your email to verify your account' }, error: null }
}

/**
 * Returns the Google OAuth URL configured with invite_token in redirectTo.
 * The client must redirect via window.location.href (cannot use router.push — OAuth requires
 * leaving Next.js routing context entirely).
 */
export async function signInWithGoogleForInvite(
  token: string
): Promise<Result<{ url: string }>> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    return { data: null, error: { message: 'App URL not configured', code: 'CONFIG_ERROR' } }
  }

  const supabase = await createUserClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl}/api/auth/callback?invite_token=${encodeURIComponent(token)}`,
    },
  })
  if (error) return { data: null, error: { message: error.message } }
  if (!data.url) return { data: null, error: { message: 'OAuth redirect URL missing', code: 'AUTH_ERROR' } }

  return { data: { url: data.url }, error: null }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/**
 * Core invite acceptance logic.
 * All public actions delegate here after obtaining userId from their respective auth flows.
 */
async function _runInviteAcceptance(
  token: string,
  userId: string,
  userEmail: string | null | undefined
): Promise<Result<{ teamId: string }>> {
  // Validate invite (outside transaction — read-only)
  const inviteResult = await validateInviteToken(token)
  if (inviteResult.error) return { data: null, error: inviteResult.error }
  const invite = inviteResult.data

  // Email match — REJECT if invite email is missing (malformed invite) or user email doesn't match
  if (!invite.email) {
    return { data: null, error: { message: 'Invalid invite: no target email', code: 'INVITE_INVALID' } }
  }
  if (!userEmail || userEmail.toLowerCase() !== invite.email.toLowerCase()) {
    return {
      data: null,
      error: { message: 'This invite was sent to a different email address', code: 'INVITE_EMAIL_MISMATCH' },
    }
  }

  // Role allow-list — validate before any DB write
  if (!ALLOWED_ROLES.includes(invite.role as AllowedRole)) {
    return { data: null, error: { message: 'Invalid invite role', code: 'INVITE_INVALID_ROLE' } }
  }

  // Ensure profile row exists before transaction — prevents UPDATE affecting zero rows.
  // Handle both NOT_FOUND and DB_ERROR: if we can't confirm the profile exists, upsert defensively.
  const profileResult = await getUserProfile(userId)
  if (profileResult.error) {
    await upsertProfile(userId, { tier: 'free' })
  }

  try {
    await db.transaction(async (tx) => {
      // Re-validate inside transaction: SELECT FOR UPDATE locks the row, preventing
      // concurrent double-acceptance between two simultaneous requests
      const lockedInvite = await tx.execute(
        sql`SELECT id, used_at FROM pending_invites WHERE token = ${token} AND used_at IS NULL AND is_revoked = false FOR UPDATE`
      )
      // postgres-js returns a RowList (array-like) — check length directly
      if (!lockedInvite.length) {
        throw new Error('INVITE_ALREADY_USED')
      }

      // 1. Update tier — preserve current tier in previous_tier via subquery.
      //    Using a subquery avoids the Postgres SET-clause self-reference ambiguity:
      //    `SET previous_tier = tier` in the same SET would reference the NEW tier value being written.
      await tx
        .update(profiles)
        .set({
          tier: invite.role,
          previousTier: sql`(SELECT tier FROM profiles WHERE id = ${userId})`,
        })
        .where(eq(profiles.id, userId))

      // 2. Add to team_members — ON CONFLICT DO NOTHING makes this idempotent
      await tx
        .insert(teamMembers)
        .values({ teamId: invite.teamId, userId, role: invite.role, joinedAt: new Date() })
        .onConflictDoNothing()

      // 3. Mark invite used — prevents second acceptance
      await tx
        .update(pendingInvites)
        .set({ usedAt: new Date() })
        .where(eq(pendingInvites.token, token))
    })

    log({
      action: 'team.invite.accepted',
      userId,
      teamId: invite.teamId,
      role: invite.role,
      timestamp: new Date().toISOString(),
    })
    return { data: { teamId: invite.teamId }, error: null }
  } catch (err) {
    const errMsg = String(err)
    if (errMsg.includes('INVITE_ALREADY_USED')) {
      return { data: null, error: { message: 'This invite has already been used', code: 'INVITE_USED' } }
    }
    log({
      action: 'team.invite.failed',
      userId,
      error: errMsg,
      timestamp: new Date().toISOString(),
    })
    return { data: null, error: { message: 'Failed to join team', code: 'DB_ERROR' } }
  }
}
