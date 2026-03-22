'use server'
import { createUserClient } from '@/lib/supabase/user'
import { createAnonymousReview } from '@/server/db/queries/reviews'
import type { Result } from '@/types'

/**
 * Writes a card rating for the current anonymous (or authenticated) user.
 * Security: userId is derived from supabase.auth.getUser() server-side —
 * never accepted as a caller parameter (prevents writing ratings to another user's ID).
 */
export async function rateAnonymousCard(
  cardId: string,
  rating: 1 | 2 | 3 | 4
): Promise<Result<null>> {
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
