import { z } from 'zod'

export const newPasswordSchema = z
  .string()
  .min(8, { error: 'Password must be at least 8 characters' })

export type NewPasswordInput = z.infer<typeof newPasswordSchema>

/**
 * Validates a new password input. Returns a Zod SafeParseResult so the
 * caller can access both the parsed value and any error messages.
 */
export function validateNewPassword(value: unknown): ReturnType<typeof newPasswordSchema.safeParse> {
  return newPasswordSchema.safeParse(value)
}
