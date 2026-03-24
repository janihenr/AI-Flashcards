import { db } from '@/server/db'
import { profiles, anonymousSessions } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import type { Result } from '@/types'

type ProfileUpdateData = {
  displayName?: string | null
  avatarUrl?: string | null
}

type ProfileUpsertData = {
  tier?: string
  gdprConsentAt?: Date | null
  isAdmin?: boolean
}

/**
 * Upsert a profile row for a newly registered user.
 * - INSERT: sets all provided fields including gdprConsentAt
 * - ON CONFLICT: updates only tier/isAdmin — gdprConsentAt intentionally omitted
 *   so an existing consent timestamp is NEVER overwritten (GDPR Article 7)
 */
export async function upsertProfile(
  userId: string,
  data: ProfileUpsertData
): Promise<void> {
  const { tier = 'free', gdprConsentAt, isAdmin = false } = data
  await db
    .insert(profiles)
    .values({
      id: userId,
      tier,
      isAdmin,
      // Pass null explicitly to store NULL; omit entirely when undefined to use column default
      ...(gdprConsentAt !== undefined ? { gdprConsentAt } : {}),
    })
    .onConflictDoUpdate({
      target: profiles.id,
      // gdprConsentAt intentionally omitted: INSERT sets it on first signup;
      // UPDATE must NOT overwrite an existing consent timestamp
      set: { tier, isAdmin },
    })
}

export async function updateProfile(
  userId: string,
  data: ProfileUpdateData
): Promise<Result<void>> {
  // Explicit whitelist — never spread unknown keys into set()
  const patch: { displayName?: string | null; avatarUrl?: string | null } = {}
  if ('displayName' in data) patch.displayName = data.displayName
  if ('avatarUrl' in data) patch.avatarUrl = data.avatarUrl

  if (Object.keys(patch).length === 0) {
    return { data: undefined, error: null } // no-op, nothing to write
  }

  try {
    await db
      .update(profiles)
      .set(patch)
      .where(eq(profiles.id, userId))
    return { data: undefined, error: null }
  } catch (err) {
    console.error('[updateProfile] DB error:', err)
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}

export async function getUserProfile(userId: string): Promise<Result<typeof profiles.$inferSelect>> {
  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
    })
    if (!profile) return { data: null, error: { message: 'Profile not found', code: 'NOT_FOUND' } }
    return { data: profile, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}

export async function updateProfileTier(
  userId: string,
  tier: string,
  previousTier?: string
): Promise<Result<void>> {
  try {
    await db
      .update(profiles)
      .set({ tier, previousTier: previousTier ?? null })
      .where(eq(profiles.id, userId))
    return { data: undefined, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}

/**
 * Marks an anonymous session as linked (upgraded to a registered account).
 * Sets linked_at = now() to prevent the purge-anonymous-sessions cron from deleting it.
 * Idempotent: safe to call multiple times (subsequent calls are no-ops if already set).
 * Uses Drizzle direct Postgres connection — bypasses RLS (service-role equivalent).
 */
export async function markAnonymousSessionLinked(anonUserId: string): Promise<void> {
  await db
    .update(anonymousSessions)
    .set({ linkedAt: new Date() })
    .where(eq(anonymousSessions.supabaseAnonId, anonUserId))
}

export async function validateSystemUser(): Promise<void> {
  const systemUserId = process.env.SYSTEM_USER_ID
  if (!systemUserId) {
    throw new Error('[STARTUP] SYSTEM_USER_ID env var is not set — cold start deck will be broken')
  }
  const result = await getUserProfile(systemUserId)
  if (result.error) {
    throw new Error(`[STARTUP] System user ${systemUserId} not found in profiles — run seed.sql`)
  }
}
