'use server'
import { createUserClient } from '@/lib/supabase/user'
import type { Result } from '@/types'

/**
 * Signs in with email + password.
 *
 * Security: NEVER expose Supabase's raw error — it reveals whether the email
 * exists (enumeration attack surface). Always return the same generic message.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<Result<{ redirectUrl: string }>> {
  const supabase = await createUserClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return {
      data: null,
      error: { message: 'Invalid email or password', code: 'AUTH_INVALID_CREDENTIALS' },
    }
  }

  return { data: { redirectUrl: '/decks' }, error: null }
}

/**
 * Initiates Google OAuth sign-in from the login page.
 * No ToS check — user already agreed during signup.
 *
 * @param redirectTo - validated relative path to redirect to after login (e.g. '/decks/42')
 */
export async function signInWithGoogleLogin(redirectTo?: string): Promise<Result<{ url: string }>> {
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return { data: null, error: { message: 'App URL not configured', code: 'CONFIG_ERROR' } }
  }
  const callbackUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`)
  if (redirectTo) callbackUrl.searchParams.set('redirectTo', redirectTo)

  const supabase = await createUserClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
    },
  })
  if (error) return { data: null, error: { message: 'Google sign-in failed. Please try again.', code: 'AUTH_ERROR' } }
  if (!data.url) return { data: null, error: { message: 'OAuth redirect URL missing', code: 'AUTH_ERROR' } }
  return { data: { url: data.url }, error: null }
}
