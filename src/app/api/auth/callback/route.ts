import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createUserClient } from '@/lib/supabase/user'
import { upsertProfile, markAnonymousSessionLinked } from '@/server/db/queries/users'
import { completeAnonymousUpgrade } from '@/server/actions/upgrade'
import { acceptTeamInvite } from '@/app/(auth)/invite/[token]/actions'

// Use x-forwarded-host in production to avoid Vercel load-balancer URL as origin.
// Validates the header against NEXT_PUBLIC_APP_URL to prevent open-redirect via header injection.
function buildRedirect(origin: string, request: Request, path: string): NextResponse {
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.redirect(`${origin}${path}`)
  }
  const forwardedHost = request.headers.get('x-forwarded-host')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (forwardedHost && appUrl) {
    const expectedHost = new URL(appUrl).host
    if (forwardedHost === expectedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${path}`)
    }
  }
  return NextResponse.redirect(`${origin}${path}`)
}

/**
 * Supabase OAuth + email verification callback.
 *
 * Integration contract (Stories 1.5, 1.6, 1.7, 1.8 all modify this route):
 * 1. code absent          → /login?error=auth_failed
 * 2. type=recovery        → /reset-password?step=update          (Story 1.8)
 * 3. invite_token present → accept team invite after exchange     (Story 1.7)
 * 4. anon_upgrade_id cookie → anonymous upgrade after exchange    (Story 1.6)
 * 5. default              → upsertProfile + honor redirectTo      (Story 1.5)
 *
 * NEVER use getSession() — getUser() validates with Supabase server.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (!code) {
    return buildRedirect(origin, request, '/login?error=auth_failed')
  }

  const supabase = await createUserClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return buildRedirect(origin, request, '/login?error=auth_failed')
  }

  const cookieStore = await cookies()

  // Password recovery flow — redirect to password update form (Story 1.8)
  // Clear upgrade cookie if present (stale from an aborted upgrade attempt)
  if (type === 'recovery') {
    const response = buildRedirect(origin, request, '/reset-password?step=update')
    if (cookieStore.get('anon_upgrade_id')) {
      response.cookies.delete('anon_upgrade_id')
    }
    return response
  }

  // Story 1.7: invite_token handling
  // Combined flow precedence: anonymous upgrade FIRST (preserves FSRS), then team invite (sets correct tier)
  const inviteToken = searchParams.get('invite_token')

  if (inviteToken) {
    // GDPR consent check — OAuth invite signup must verify ToS acceptance (same as fresh OAuth signup)
    const isOAuthInvite = data.user.app_metadata?.provider === 'google'
    const tosAcceptedForInvite = cookieStore.get('tos_accepted')?.value === 'true'
    if (isOAuthInvite && !tosAcceptedForInvite) {
      return buildRedirect(origin, request, '/terms?required=true')
    }

    const anonId = cookieStore.get('anon_upgrade_id')?.value

    // If there is also an anonymous upgrade pending — run it first to transfer FSRS history.
    // acceptTeamInvite will then overwrite the 'free' tier with 'team_member'/'team_admin'.
    if (anonId && anonId !== data.user.id) {
      const upgradeResult = await completeAnonymousUpgrade(anonId, data.user.id)
      if (upgradeResult.error) {
        console.error('[auth/callback] completeAnonymousUpgrade (pre-invite) failed:', upgradeResult.error.message)
      }
    }

    const inviteResult = await acceptTeamInvite(inviteToken)

    if (inviteResult.error) {
      console.error('[auth/callback] acceptTeamInvite failed:', inviteResult.error.message)
      // Non-fatal: user is authenticated; set flash cookie so /decks can show a banner
      const response = buildRedirect(origin, request, '/decks')
      response.cookies.set('invite_error', 'true', { httpOnly: false, maxAge: 60, path: '/' })
      if (anonId) response.cookies.delete('anon_upgrade_id')
      response.cookies.delete('tos_accepted')
      return response
    }

    const response = buildRedirect(origin, request, `/decks?team=${inviteResult.data.teamId}`)
    if (anonId) response.cookies.delete('anon_upgrade_id')
    response.cookies.delete('tos_accepted')
    return response
  }

  // Anonymous upgrade (Story 1.6) — cookie set by Server Action before OAuth / updateUser
  // httpOnly cookie — NOT a query param (query params appear in access logs and referrers)
  const anonId = cookieStore.get('anon_upgrade_id')?.value

  if (anonId) {
    // GDPR consent check — same as fresh OAuth signup
    const isOAuth = data.user.app_metadata?.provider === 'google'
    const tosAcceptedCookie = cookieStore.get('tos_accepted')?.value === 'true'
    if (isOAuth && !tosAcceptedCookie) {
      const response = buildRedirect(origin, request, '/terms?required=true')
      response.cookies.delete('anon_upgrade_id')
      return response
    }

    if (anonId !== data.user.id) {
      // OAuth upgrade: new authenticated user ID — transfer anonymous reviews
      // completeAnonymousUpgrade handles upsertProfile + linked_at + review transfer atomically
      const upgradeResult = await completeAnonymousUpgrade(anonId, data.user.id)
      if (upgradeResult.error) {
        // Non-fatal: user is authenticated; log is inside completeAnonymousUpgrade
        // Proceed to /decks regardless — partial data loss is better than broken auth
        console.error('[auth/callback] completeAnonymousUpgrade failed:', upgradeResult.error.message)
      }
    } else {
      // Email/password upgrade: same user ID — reviews already belong to this user.
      // markAnonymousSessionLinked was already called in upgradeWithEmailPassword, but
      // calling again is idempotent. Create profile row (may not exist yet).
      try {
        await upsertProfile(data.user.id, { tier: 'free', gdprConsentAt: new Date() })
      } catch (err) {
        console.error('[auth/callback] email upgrade upsertProfile failed:', err)
      }
      try {
        await markAnonymousSessionLinked(anonId)
      } catch (err) {
        console.error('[auth/callback] email upgrade markAnonymousSessionLinked failed:', err)
      }
    }

    // Always clear the upgrade cookie — prevents stale cookie replay attacks (ADR-001)
    const response = buildRedirect(origin, request, '/decks')
    response.cookies.delete('anon_upgrade_id')
    response.cookies.delete('tos_accepted')
    return response
  }

  // Fresh signup (no upgrade cookie).
  // For email/password: ToS was validated server-side in signUpWithEmail() — always set gdprConsentAt.
  // For OAuth: tos_accepted cookie is set by the signup page before the OAuth redirect.
  //   If absent (user bypassed the consent step), redirect to terms before proceeding.
  const isOAuth = data.user.app_metadata?.provider === 'google'
  const tosAcceptedCookie = cookieStore.get('tos_accepted')?.value === 'true'

  if (isOAuth && !tosAcceptedCookie) {
    return buildRedirect(origin, request, '/terms?required=true')
  }

  try {
    await upsertProfile(data.user.id, { tier: 'free', gdprConsentAt: new Date() })
  } catch (err) {
    console.error('[auth/callback] upsertProfile failed:', err)
  }

  // Honor post-login redirect — validated via URL parsing to block open redirects including
  // percent-encoded variants (%2F, %09, etc.) that bypass prefix checks.
  const rawRedirect = searchParams.get('redirectTo') ?? '/decks'
  let safeRedirect = '/decks'
  try {
    const candidate = new URL(rawRedirect, origin)
    if (candidate.origin === origin) {
      safeRedirect = candidate.pathname + candidate.search + candidate.hash
    }
  } catch {
    // Malformed URL — use default
  }

  const response = buildRedirect(origin, request, safeRedirect)
  response.cookies.delete('tos_accepted')
  return response
}
