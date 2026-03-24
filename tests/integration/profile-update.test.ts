/**
 * Integration tests for Story 2-1: Profile Update DAL and Server Actions
 *
 * Prerequisites: `supabase start` must be running locally.
 * Run with: pnpm test tests/integration/profile-update.test.ts
 *
 * Tests hit a real Supabase local instance — no mocks.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/server/db'
import { profiles } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { updateProfile } from '@/server/db/queries/users'

// DB-dependent tests require `supabase start` and a valid DATABASE_URL
const hasDb = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('placeholder')

function makeTestId(): string {
  // UUID node section must be 12 hex chars (0-9, a-f) — base-36 would include invalid chars
  const tsPart = (Date.now() & 0xffffff).toString(16).padStart(6, '0')
  const rPart = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
  const fill = `${tsPart}${rPart}`
  return `00000000-0000-0000-ee00-${fill}`
}

// ─── updateProfile DAL integration tests ───────────────────────────────────

describe.skipIf(!hasDb)('updateProfile (requires supabase start)', () => {
  let testUserId: string

  beforeEach(async () => {
    testUserId = makeTestId()
    // Insert a minimal profile row for the test user
    await db.insert(profiles).values({ id: testUserId, tier: 'free' })
  })

  afterEach(async () => {
    await db.delete(profiles).where(eq(profiles.id, testUserId))
  })

  it('updates displayName only when avatarUrl is omitted', async () => {
    const result = await updateProfile(testUserId, { displayName: 'Test User' })
    expect(result.error).toBeNull()

    const row = await db.query.profiles.findFirst({ where: eq(profiles.id, testUserId) })
    expect(row?.displayName).toBe('Test User')
    expect(row?.avatarUrl).toBeNull()
  })

  it('updates avatarUrl only when displayName is omitted', async () => {
    const url = 'https://example.supabase.co/storage/v1/object/public/avatars/test/avatar.png'
    const result = await updateProfile(testUserId, { avatarUrl: url })
    expect(result.error).toBeNull()

    const row = await db.query.profiles.findFirst({ where: eq(profiles.id, testUserId) })
    expect(row?.avatarUrl).toBe(url)
    expect(row?.displayName).toBeNull()
  })

  it('updates both fields when both are provided', async () => {
    const url = 'https://example.supabase.co/storage/v1/object/public/avatars/test/avatar.png'
    const result = await updateProfile(testUserId, { displayName: 'Both Updated', avatarUrl: url })
    expect(result.error).toBeNull()

    const row = await db.query.profiles.findFirst({ where: eq(profiles.id, testUserId) })
    expect(row?.displayName).toBe('Both Updated')
    expect(row?.avatarUrl).toBe(url)
  })

})
