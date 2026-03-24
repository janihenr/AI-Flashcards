'use server'
import { z } from 'zod'
import { createUserClient } from '@/lib/supabase/user'
import type { Result } from '@/types'

const emailSchema = z.email({ error: 'Please enter a valid email' })

/**
 * Sends a password reset email.
 *
 * Security rules:
 * - Always returns success for valid-format emails (never reveals whether an email is registered)
 * - Returns a validation error for empty or invalid-format emails (prevents meaningless API calls)
 */
export async function requestPasswordReset(
  email: string
): Promise<Result<{ sent: true }>> {
  const trimmed = email.trim()
  if (trimmed.length === 0) {
    return { data: null, error: { message: 'Email is required', code: 'VALIDATION_ERROR' } }
  }

  const parsed = emailSchema.safeParse(trimmed)
  if (!parsed.success) {
    return {
      data: null,
      error: { message: parsed.error.issues[0]?.message ?? 'Invalid email', code: 'VALIDATION_ERROR' },
    }
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return { data: null, error: { message: 'App URL not configured', code: 'CONFIG_ERROR' } }
  }

  const supabase = await createUserClient()
  // Always call even on error — return value is intentionally ignored to prevent enumeration
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?type=recovery`,
  })

  // Always succeed — never reveal whether the email is registered
  return { data: { sent: true }, error: null }
}

/**
 * Updates the user's password during a recovery session.
 * Must be called from the /reset-password?step=update page after the user
 * has clicked the recovery link in their email (which exchanges the code for a session).
 */
export async function updatePassword(
  newPassword: string
): Promise<Result<void>> {
  const supabase = await createUserClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    return {
      data: null,
      error: { message: 'Reset link expired — please request a new one', code: 'AUTH_ERROR' },
    }
  }

  return { data: undefined, error: null }
}
