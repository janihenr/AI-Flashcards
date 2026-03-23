'use server'
import { db, anonymousSessions, reviews, profiles } from '@/server/db'
import { and, eq, isNull } from 'drizzle-orm'
import type { Result } from '@/types'
import { log } from '@/lib/logger'

/**
 * Completes the anonymous-to-registered upgrade atomically:
 * 1. Idempotency guard — skips if session already linked (ADR-001 Layer 3)
 * 2. Single Drizzle transaction (all-or-nothing):
 *    a. Upserts profile for the new authenticated user (satisfies reviews FK)
 *    b. Sets anonymous_sessions.linked_at = now() FIRST (protects against cron deletion)
 *    c. Transfers all reviews from anonUserId → newUserId (preserves FSRS state)
 *
 * For email/password upgrades the user ID stays the same — do NOT call this function;
 * call markAnonymousSessionLinked() + upsertProfile() directly instead.
 *
 * Never throws — always returns Result<T>.
 */
export async function completeAnonymousUpgrade(
  anonUserId: string,
  newUserId: string
): Promise<Result<{ reviewsTransferred: number }>> {
  // ADR-001 Layer 3: pre-transaction idempotency + session validation
  const session = await db.query.anonymousSessions.findFirst({
    where: eq(anonymousSessions.supabaseAnonId, anonUserId),
    columns: { linkedAt: true },
  })

  if (!session) {
    log({ action: 'auth.anonymous_upgrade.session_not_found', anonUserId, timestamp: new Date().toISOString() })
    return { data: null, error: { message: 'Anonymous session not found or expired', code: 'SESSION_EXPIRED' } }
  }

  if (session.linkedAt !== null) {
    // Already upgraded — idempotent return; no-op is correct here
    log({ action: 'auth.anonymous_upgrade.already_done', anonUserId, timestamp: new Date().toISOString() })
    return { data: { reviewsTransferred: 0 }, error: null }
  }

  try {
    const reviewsTransferred = await db.transaction(async (tx) => {
      // Step 1: Upsert profile FIRST inside the transaction — ensures FK (reviews.user_id → profiles.id)
      // is satisfied before the review transfer. If the transaction rolls back, no zombie profile is left.
      await tx
        .insert(profiles)
        .values({ id: newUserId, tier: 'free', isAdmin: false, gdprConsentAt: new Date() })
        .onConflictDoUpdate({
          target: profiles.id,
          // gdprConsentAt intentionally omitted from UPDATE: never overwrite an existing consent timestamp
          set: { tier: 'free', isAdmin: false },
        })

      // Step 2: Mark session linked atomically — WHERE linked_at IS NULL is the idempotency guard.
      // Using a conditional update (not a pre-check) eliminates the TOCTOU window between
      // the pre-transaction check and the transaction itself.
      const markResult = await tx
        .update(anonymousSessions)
        .set({ linkedAt: new Date() })
        .where(and(eq(anonymousSessions.supabaseAnonId, anonUserId), isNull(anonymousSessions.linkedAt)))
        .returning({ id: anonymousSessions.id })

      if (markResult.length === 0) {
        // Another concurrent transaction already completed the upgrade — reviews already transferred.
        return -1 // sentinel: already done
      }

      // Step 3: Transfer FSRS review history — reassigns user_id; no row is re-inserted.
      // stability, difficulty, state, due are untouched.
      const updated = await tx
        .update(reviews)
        .set({ userId: newUserId })
        .where(eq(reviews.userId, anonUserId))
        .returning({ id: reviews.id })

      return updated.length
    })

    if (reviewsTransferred === -1) {
      log({ action: 'auth.anonymous_upgrade.already_done', anonUserId, timestamp: new Date().toISOString() })
      return { data: { reviewsTransferred: 0 }, error: null }
    }

    log({
      action: 'auth.anonymous_upgrade.complete',
      anonUserId,
      newUserId,
      reviewsTransferred,
      timestamp: new Date().toISOString(),
    })
    return { data: { reviewsTransferred }, error: null }
  } catch (err) {
    log({
      action: 'auth.anonymous_upgrade.failed',
      anonUserId,
      newUserId,
      error: String(err),
      timestamp: new Date().toISOString(),
    })
    return { data: null, error: { message: 'Upgrade transaction failed', code: 'DB_ERROR' } }
  }
}
