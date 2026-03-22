import { db } from '@/server/db'
import { profiles } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import type { Result } from '@/types'

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
