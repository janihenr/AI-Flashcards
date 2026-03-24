import { z } from 'zod'

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, { error: 'Name cannot be empty' })
  .max(50, { error: 'Name must be 50 characters or fewer' })

export type DisplayNameInput = z.infer<typeof displayNameSchema>

/**
 * Validates a display name input. Returns a Zod SafeParseResult so the
 * caller can access both the parsed value and any error messages.
 */
export function validateDisplayNameInput(value: unknown): z.SafeParseReturnType<string> {
  return displayNameSchema.safeParse(value)
}

/**
 * Validates that an avatar URL belongs to our Supabase Storage avatars bucket.
 * Checks: same hostname as NEXT_PUBLIC_SUPABASE_URL, https protocol only,
 * and path starts with /storage/v1/object/public/avatars/.
 * Prevents storing arbitrary external URLs or paths outside the avatars bucket.
 */
/**
 * Validates that an avatar URL belongs to our Supabase Storage avatars bucket.
 * Checks: https protocol, same hostname as NEXT_PUBLIC_SUPABASE_URL, path starts
 * with /storage/v1/object/public/avatars/, and no path traversal sequences.
 *
 * Optionally verifies the userId segment in the path matches `expectedUserId`.
 * Always pass `expectedUserId` from the server action to prevent referencing
 * another user's avatar file.
 */
export function validateAvatarUrl(url: string, expectedUserId?: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    console.error('[validateAvatarUrl] NEXT_PUBLIC_SUPABASE_URL is not set — rejecting all avatar URLs')
    return false
  }
  try {
    const parsed = new URL(url)
    const base = new URL(supabaseUrl)

    // Block path traversal (case-insensitive to catch %2E/%2F uppercase variants)
    // and reject any query string or fragment that could manipulate the resource reference.
    const pathname = parsed.pathname
    const pathnameLower = pathname.toLowerCase()
    if (pathnameLower.includes('..') || pathnameLower.includes('%2e') || pathnameLower.includes('%2f')) {
      return false
    }
    if (parsed.search !== '' || parsed.hash !== '') {
      return false
    }

    const avatarsPrefix = '/storage/v1/object/public/avatars/'
    if (
      parsed.protocol !== 'https:' ||
      parsed.hostname !== base.hostname ||
      !pathname.startsWith(avatarsPrefix)
    ) {
      return false
    }

    // Optional: verify the URL path's userId segment matches the authenticated user
    if (expectedUserId !== undefined) {
      const afterPrefix = pathname.slice(avatarsPrefix.length)
      const pathUserId = afterPrefix.split('/')[0]
      if (pathUserId !== expectedUserId) return false
    }

    return true
  } catch {
    return false
  }
}
