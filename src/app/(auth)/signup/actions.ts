'use server'
import { cookies } from 'next/headers'
import { createUserClient } from '@/lib/supabase/user'
import { signupEmailSchema } from '@/lib/validators/auth'
import type { Result } from '@/types'

/**
 * Signs up a new user with email + password.
 *
 * Security: tosAccepted validated server-side — cannot be bypassed by calling
 * the action directly (GDPR/legal requirement; client-side is bypassable).
 *
 * Supabase sends the verification email via custom SMTP (Resend) — do NOT
 * call sendEmail() here; that would produce duplicate verification emails.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  tosAccepted: boolean
): Promise<Result<{ message: string }>> {
  // ToS acceptance is a legal/GDPR requirement — validate explicitly before anything else
  if (!tosAccepted) {
    return {
      data: null,
      error: { message: 'You must accept the Terms of Service to continue', code: 'TOS_NOT_ACCEPTED' },
    }
  }

  // signupEmailSchema = signupSchema.omit({ tosAccepted: true })
  const parsed = signupEmailSchema.safeParse({ email, password })
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input'
    return { data: null, error: { message: msg, code: 'VALIDATION_ERROR' } }
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return { data: null, error: { message: 'App URL not configured', code: 'CONFIG_ERROR' } }
  }

  const supabase = await createUserClient()
  const { data: signUpData, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')}/api/auth/callback`,
    },
  })
  if (error) return { data: null, error: { message: error.message } }

  // Supabase silently succeeds for already-registered emails (no error, no email sent).
  // Detect this: identities array is empty for duplicate signups.
  // Return the same message to avoid revealing whether an email is registered (enumeration protection).
  if (signUpData?.user?.identities?.length === 0) {
    return { data: { message: 'Check your email to verify your account' }, error: null }
  }

  return { data: { message: 'Check your email to verify your account' }, error: null }
}

/**
 * Initiates Google OAuth sign-in.
 * Validates tosAccepted server-side and sets the tos_accepted cookie server-side
 * (prevents third-party script pre-forgery of the consent signal).
 * Returns the OAuth redirect URL — client must redirect via window.location.href.
 * (NOT router.push — must leave Next.js routing context for the external OAuth flow.)
 */
export async function signInWithGoogle(tosAccepted: boolean): Promise<Result<{ url: string }>> {
  if (!tosAccepted) {
    return { data: null, error: { message: 'You must accept the Terms of Service to continue', code: 'TOS_NOT_ACCEPTED' } }
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return { data: null, error: { message: 'App URL not configured', code: 'CONFIG_ERROR' } }
  }
  // Set tos_accepted server-side — checked in /api/auth/callback to record gdprConsentAt.
  // httpOnly: true — the callback reads it server-side via cookies(), which can read httpOnly cookies.
  // Keeping it httpOnly prevents client JS from forging the consent signal via XSS.
  const cookieStore = await cookies()
  cookieStore.set('tos_accepted', 'true', {
    httpOnly: true,
    maxAge: 300,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
  const supabase = await createUserClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')}/api/auth/callback`,
    },
  })
  if (error) return { data: null, error: { message: error.message } }
  if (!data.url) return { data: null, error: { message: 'OAuth redirect URL missing', code: 'AUTH_ERROR' } }
  return { data: { url: data.url }, error: null }
}
