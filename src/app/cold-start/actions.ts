'use server'
import { cookies } from 'next/headers'
import { createUserClient } from '@/lib/supabase/user'
import { createAnonymousReview } from '@/server/db/queries/reviews'
import { markAnonymousSessionLinked, upsertProfile } from '@/server/db/queries/users'
import { signupEmailSchema } from '@/lib/validators/auth'
import { log } from '@/lib/logger'
import type { Result } from '@/types'

/**
 * Initiates Google OAuth upgrade from an anonymous session to a registered account.
 * Implements ADR-001 mitigation strategy:
 * - Layer 1: getUser() pre-call guard (verifies session is still anonymous)
 * - Layer 2: conflict detection (identity_already_exists / HTTP 422 → recover gracefully)
 *
 * Validates tosAccepted server-side and sets the tos_accepted cookie server-side
 * (prevents third-party script pre-forgery of the consent signal).
 *
 * Sets anon_upgrade_id httpOnly cookie BEFORE the OAuth redirect so the auth callback
 * can identify this as an upgrade and call completeAnonymousUpgrade().
 *
 * Returns the OAuth redirect URL — client must navigate via window.location.href.
 */
export async function upgradeAnonymousSession(
  provider: 'google',
  tosAccepted: boolean
): Promise<Result<{ url: string }>> {
  if (!tosAccepted) {
    return { data: null, error: { message: 'You must accept the Terms of Service to continue', code: 'TOS_NOT_ACCEPTED' } }
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return { data: null, error: { message: 'App URL not configured', code: 'CONFIG_ERROR' } }
  }

  const supabase = await createUserClient()

  // ADR-001 Layer 1: verify session is still anonymous before linking
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      data: null,
      error: { message: 'Session expired. Start a new study session to sign up.', code: 'SESSION_EXPIRED' },
    }
  }

  if (!user.is_anonymous) {
    // Already upgraded — idempotent path
    log({ action: 'auth.link_identity.already_upgraded', userId: user.id, timestamp: new Date().toISOString() })
    return { data: { url: `${process.env.NEXT_PUBLIC_APP_URL}/decks` }, error: null }
  }

  // Set cookies before OAuth redirect
  const cookieStore = await cookies()
  cookieStore.set('anon_upgrade_id', user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes — enough for slow OAuth providers and user pauses
    sameSite: 'lax',
    path: '/',
  })
  // tos_accepted: set server-side after validating tosAccepted — prevents JS pre-forgery
  cookieStore.set('tos_accepted', 'true', {
    httpOnly: false, // must be readable by the callback after OAuth redirect
    maxAge: 300,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
  const { data, error } = await supabase.auth.linkIdentity({ provider, options: { redirectTo } })

  if (error) {
    // ADR-001 Layer 2: identity_already_exists or 422 → concurrent upgrade succeeded elsewhere
    if (error.message.includes('identity_already_exists') || error.status === 422) {
      log({ action: 'auth.link_identity.conflict', userId: user.id, error: error.message, timestamp: new Date().toISOString() })
      // Clear the upgrade cookie — upgrade already complete; stale cookie would trigger the
      // upgrade branch again on the next callback visit.
      cookieStore.delete('anon_upgrade_id')
      return { data: { url: `${process.env.NEXT_PUBLIC_APP_URL}/decks` }, error: null }
    }
    // General failure: clear cookie — linkIdentity failed, cookie would be stale on retry
    cookieStore.delete('anon_upgrade_id')
    return { data: null, error: { message: error.message, code: 'AUTH_ERROR' } }
  }

  if (!data?.url) {
    return { data: null, error: { message: 'No OAuth redirect URL returned', code: 'AUTH_ERROR' } }
  }
  return { data: { url: data.url }, error: null }
}

/**
 * Upgrades an anonymous session to a registered email/password account.
 * Uses supabase.auth.updateUser() — the user ID stays the same (no review transfer needed).
 *
 * Creates the profile row and marks the session linked immediately — before verification —
 * so the state is always consistent even if the user never clicks the verification link.
 *
 * Sets anon_upgrade_id cookie so the callback can perform idempotent cleanup on verification.
 */
export async function upgradeWithEmailPassword(
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

  const parsed = signupEmailSchema.safeParse({ email, password })
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input'
    return { data: null, error: { message: msg, code: 'VALIDATION_ERROR' } }
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return { data: null, error: { message: 'App URL not configured', code: 'CONFIG_ERROR' } }
  }

  const supabase = await createUserClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      data: null,
      error: { message: 'Session expired. Start a new study session to sign up.', code: 'SESSION_EXPIRED' },
    }
  }

  if (!user.is_anonymous) {
    // Already upgraded — idempotent path
    log({ action: 'auth.email_upgrade.already_upgraded', userId: user.id, timestamp: new Date().toISOString() })
    return { data: { message: 'Your account is already set up. Check your email to verify.' }, error: null }
  }

  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email, password: parsed.data.password },
    { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback` }
  )

  if (error) {
    log({ action: 'auth.email_upgrade.failed', userId: user.id, error: error.message, timestamp: new Date().toISOString() })
    return { data: null, error: { message: error.message, code: 'AUTH_ERROR' } }
  }

  // Create profile row immediately — user ID is stable for email upgrade, so this is safe.
  // Prevents zombie state (linked_at set but no profile) if the user never verifies.
  // Non-fatal: callback will retry via upsertProfile on verification (idempotent).
  try {
    await upsertProfile(user.id, { tier: 'free', gdprConsentAt: new Date() })
  } catch (err) {
    log({ action: 'auth.email_upgrade.upsert_profile_failed', userId: user.id, error: String(err), timestamp: new Date().toISOString() })
  }

  // Mark session linked immediately — protects against cron deletion during verification window.
  // For email upgrade the user ID stays the same, so reviews already belong to the correct user.
  await markAnonymousSessionLinked(user.id)

  // Set cookie so callback knows this was an upgrade (profile creation + cookie cleanup)
  const cookieStore = await cookies()
  cookieStore.set('anon_upgrade_id', user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    sameSite: 'lax',
    path: '/',
  })

  log({ action: 'auth.email_upgrade.complete', userId: user.id, timestamp: new Date().toISOString() })
  return { data: { message: 'Check your email to verify your account' }, error: null }
}

/**
 * Writes a card rating for the current anonymous (or authenticated) user.
 * Security: userId is derived from supabase.auth.getUser() server-side —
 * never accepted as a caller parameter (prevents writing ratings to another user's ID).
 */
export async function rateAnonymousCard(
  cardId: string,
  rating: 1 | 2 | 3 | 4
): Promise<Result<null>> {
  if (rating < 1 || rating > 4 || !Number.isInteger(rating)) {
    return { data: null, error: { message: 'Invalid rating: must be 1, 2, 3, or 4', code: 'VALIDATION_ERROR' } }
  }
  const supabase = await createUserClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { data: null, error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } }
  }

  return createAnonymousReview(user.id, cardId, rating)
}
