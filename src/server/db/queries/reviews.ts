import { db } from '@/server/db'
import { reviews } from '@/server/db/schema'
import type { Result } from '@/types'

type CreateReviewInput = {
  cardId: string
  userId: string
  rating: number
  presentationMode: 'qa' | 'image' | 'context-narrative'
  responseTimeMs: number
}

export async function createReview(input: CreateReviewInput): Promise<Result<typeof reviews.$inferSelect>> {
  try {
    const [review] = await db.insert(reviews).values(input).returning()
    return { data: review, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}

/**
 * Writes an anonymous card review. Omits presentationMode and responseTimeMs —
 * behavioral signals are not stored for anonymous sessions (GDPR legitimate interest basis).
 * userId is derived server-side from auth session — never passed as a client parameter.
 */
export async function createAnonymousReview(
  anonUserId: string,
  cardId: string,
  rating: number
): Promise<Result<null>> {
  try {
    await db.insert(reviews).values({
      cardId,
      userId: anonUserId,
      rating,
      // presentationMode and responseTimeMs intentionally omitted (nullable for anon)
    })
    return { data: null, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
