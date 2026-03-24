'use server'

import { createUserClient } from '@/lib/supabase/user'
import { createServerAdminClient } from '@/lib/supabase/server'
import { validateNewPassword } from '@/lib/validators/password'
import type { Result } from '@/types'

/**
 * Changes the authenticated user's password.
 *
 * Flow:
 * 1. Verify user is authenticated via getUser()
 * 2. Validate new password length (min 8 chars) server-side
 * 3. Re-authenticate with current password to verify it is correct
 * 4. Update password via supabase.auth.updateUser()
 *
 * On success, Supabase GoTrue invalidates all refresh tokens for the user —
 * all other sessions expire at next token refresh (within JWT TTL, ≤1 hour).
 * Current session remains active.
 */
export async function changePassword(formData: FormData): Promise<Result<void>> {
  const supabase = await createUserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user || !user.email) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
  }

  const currentPassword = formData.get('currentPassword')
  const newPassword = formData.get('newPassword')

  if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
    return { data: null, error: { message: 'Current password is required', code: 'VALIDATION_ERROR' } }
  }

  const parsed = validateNewPassword(newPassword)
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0]?.message ?? 'Invalid password', code: 'VALIDATION_ERROR' },
    }
  }

  // Re-authenticate to verify current password is correct before allowing the change
  const { error: reAuthError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })

  if (reAuthError) {
    return { data: null, error: { message: 'Current password is incorrect', code: 'WRONG_PASSWORD' } }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data })

  if (updateError) {
    return { data: null, error: { message: 'Failed to update password. Please try again.', code: 'AUTH_ERROR' } }
  }

  return { data: undefined, error: null }
}

/**
 * Revokes a specific session by deleting it from auth.sessions.
 *
 * Flow:
 * 1. Verify user is authenticated via getUser()
 * 2. Delete the session row where id = sessionId AND user_id = user.id
 *    — the double user_id condition prevents IDOR (can't revoke another user's session)
 * 3. If no rows deleted: session didn't exist or didn't belong to this user → NOT_FOUND
 *
 * Deletion is immediate: Supabase GoTrue validates session_id on every token use,
 * so the revoked session cannot make new authenticated requests after this call.
 */
export async function revokeSession(sessionId: string): Promise<Result<void>> {
  const supabase = await createUserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
  }

  // Prevent self-revocation: extract current session_id from the access token and
  // block attempts to revoke the caller's own active session.
  const { data: { session: currentSession } } = await supabase.auth.getSession()
  const currentAccessToken = currentSession?.access_token
  let currentSessionId: string | null = null
  if (currentAccessToken) {
    try {
      const payloadB64 = currentAccessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'))
      currentSessionId = typeof payload.session_id === 'string' ? payload.session_id : null
    } catch { /* ignore decode failures */ }
  }
  if (currentSessionId && sessionId === currentSessionId) {
    return { data: null, error: { message: 'Cannot revoke your current session. Use sign out instead.', code: 'VALIDATION_ERROR' } }
  }

  const adminClient = createServerAdminClient()

  const { data: deleted, error: deleteError } = await adminClient
    .schema('auth')
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .select('id')

  if (deleteError) {
    return { data: null, error: { message: 'Failed to revoke session', code: 'AUTH_ERROR' } }
  }

  if (!deleted || deleted.length === 0) {
    return { data: null, error: { message: 'Session not found', code: 'NOT_FOUND' } }
  }

  return { data: undefined, error: null }
}

/**
 * Revokes all sessions except the current one.
 *
 * Uses Supabase signOut({ scope: 'others' }) which invalidates all non-current
 * sessions immediately (server-side JWT invalidation — not deferred like password change).
 */
export async function revokeOtherSessions(): Promise<Result<void>> {
  const supabase = await createUserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' })

  if (signOutError) {
    return { data: null, error: { message: 'Failed to revoke sessions', code: 'AUTH_ERROR' } }
  }

  return { data: undefined, error: null }
}
