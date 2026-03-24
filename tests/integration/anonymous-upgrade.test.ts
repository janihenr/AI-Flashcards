/**
 * Integration tests for Story 1.6: Anonymous Session Upgrade
 *
 * Prerequisites: `supabase start` must be running locally.
 * Run with: pnpm test tests/integration/anonymous-upgrade.test.ts
 *
 * These tests hit a real Supabase local instance — no mocks.
 * Rationale: mock divergence has caused prod failures before; integration tests
 * catch FK constraint issues and transaction rollback behavior that mocks miss.
 *
 * Test data is isolated using random UUIDs per test run. Tests clean up after themselves.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/server/db'
import { anonymousSessions, reviews, profiles } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { transferAnonymousReviews } from '@/server/db/queries/reviews'
import { markAnonymousSessionLinked } from '@/server/db/queries/users'
import { completeAnonymousUpgrade } from '@/server/actions/upgrade'

// DB-dependent tests require `supabase start` and a valid DATABASE_URL
const hasDb = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('placeholder')

// Helper UUIDs for test data — each test creates its own isolated rows
function makeTestIds() {
  // UUID node section must be 12 hex chars (0-9, a-f) — base-36 would include invalid chars
  const tsPart = (Date.now() & 0xffffff).toString(16).padStart(6, '0')
  const rPart = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
  const fill = `${tsPart}${rPart}`
  return {
    anonUserId: `00000000-0000-0000-aaaa-${fill}`,
    newUserId: `00000000-0000-0000-bbbb-${fill}`,
    cardId: '00000000-0000-4000-c000-000000000001', // cold-start card — must exist in seed
    sessionId: `00000000-0000-0000-cccc-${fill}`,
  }
}

// Insert a minimal profile row (bypasses RLS via Drizzle direct connection)
async function seedProfile(userId: string) {
  await db
    .insert(profiles)
    .values({ id: userId, tier: 'free', isAdmin: false })
    .onConflictDoNothing()
}

// Insert an anonymous_sessions row
async function seedAnonSession(anonUserId: string, linkedAt: Date | null = null) {
  await db
    .insert(anonymousSessions)
    .values({ supabaseAnonId: anonUserId, linkedAt: linkedAt ?? undefined })
    .onConflictDoNothing()
}

// Insert a review row for an anonymous user
async function seedReview(anonUserId: string, cardId: string) {
  const [row] = await db
    .insert(reviews)
    .values({ cardId, userId: anonUserId, rating: 3 })
    .returning({ id: reviews.id })
  return row.id
}

// Cleanup helpers — remove test rows in FK-safe order
async function cleanupReviews(userId: string) {
  await db.delete(reviews).where(eq(reviews.userId, userId))
}
async function cleanupSession(anonUserId: string) {
  await db.delete(anonymousSessions).where(eq(anonymousSessions.supabaseAnonId, anonUserId))
}
async function cleanupProfile(userId: string) {
  await db.delete(profiles).where(eq(profiles.id, userId))
}

// ─── transferAnonymousReviews ───────────────────────────────────────────────

describe.skipIf(!hasDb)('transferAnonymousReviews (requires supabase start)', () => {
  let ids: ReturnType<typeof makeTestIds>

  beforeEach(async () => {
    ids = makeTestIds()
    await seedProfile(ids.anonUserId)
    await seedProfile(ids.newUserId)
    await seedAnonSession(ids.anonUserId)
  })

  afterEach(async () => {
    await cleanupReviews(ids.anonUserId)
    await cleanupReviews(ids.newUserId)
    await cleanupSession(ids.anonUserId)
    await cleanupProfile(ids.anonUserId)
    await cleanupProfile(ids.newUserId)
  })

  it('reassigns all review user_id values to the new user', async () => {
    await seedReview(ids.anonUserId, ids.cardId)
    await seedReview(ids.anonUserId, ids.cardId)

    const result = await transferAnonymousReviews(ids.anonUserId, ids.newUserId)

    expect(result.error).toBeNull()
    expect(result.data?.count).toBe(2)

    const transferred = await db
      .select()
      .from(reviews)
      .where(eq(reviews.userId, ids.newUserId))
    expect(transferred).toHaveLength(2)

    const remaining = await db
      .select()
      .from(reviews)
      .where(eq(reviews.userId, ids.anonUserId))
    expect(remaining).toHaveLength(0)
  })

  it('returns count 0 when no reviews exist for the anon user', async () => {
    const result = await transferAnonymousReviews(ids.anonUserId, ids.newUserId)
    expect(result.error).toBeNull()
    expect(result.data?.count).toBe(0)
  })
})

// ─── markAnonymousSessionLinked ─────────────────────────────────────────────

describe.skipIf(!hasDb)('markAnonymousSessionLinked (requires supabase start)', () => {
  let ids: ReturnType<typeof makeTestIds>

  beforeEach(async () => {
    ids = makeTestIds()
    await seedProfile(ids.anonUserId)
    await seedAnonSession(ids.anonUserId)
  })

  afterEach(async () => {
    await cleanupSession(ids.anonUserId)
    await cleanupProfile(ids.anonUserId)
  })

  it('sets linked_at to a non-null timestamp', async () => {
    const before = await db.query.anonymousSessions.findFirst({
      where: eq(anonymousSessions.supabaseAnonId, ids.anonUserId),
      columns: { linkedAt: true },
    })
    expect(before?.linkedAt).toBeNull()

    await markAnonymousSessionLinked(ids.anonUserId)

    const after = await db.query.anonymousSessions.findFirst({
      where: eq(anonymousSessions.supabaseAnonId, ids.anonUserId),
      columns: { linkedAt: true },
    })
    expect(after?.linkedAt).not.toBeNull()
    expect(after?.linkedAt).toBeInstanceOf(Date)
  })

  it('is idempotent — calling twice does not throw and keeps linked_at set', async () => {
    await markAnonymousSessionLinked(ids.anonUserId)
    await expect(markAnonymousSessionLinked(ids.anonUserId)).resolves.toBeUndefined()

    const row = await db.query.anonymousSessions.findFirst({
      where: eq(anonymousSessions.supabaseAnonId, ids.anonUserId),
      columns: { linkedAt: true },
    })
    expect(row?.linkedAt).not.toBeNull()
  })
})

// ─── completeAnonymousUpgrade ────────────────────────────────────────────────

describe.skipIf(!hasDb)('completeAnonymousUpgrade (requires supabase start)', () => {
  let ids: ReturnType<typeof makeTestIds>

  beforeEach(async () => {
    ids = makeTestIds()
    await seedProfile(ids.anonUserId)
    await seedAnonSession(ids.anonUserId)
  })

  afterEach(async () => {
    await cleanupReviews(ids.anonUserId)
    await cleanupReviews(ids.newUserId)
    await cleanupSession(ids.anonUserId)
    await cleanupProfile(ids.anonUserId)
    await cleanupProfile(ids.newUserId)
  })

  it('transfers reviews, sets linked_at, and creates profile for new user', async () => {
    await seedReview(ids.anonUserId, ids.cardId)

    const result = await completeAnonymousUpgrade(ids.anonUserId, ids.newUserId)

    expect(result.error).toBeNull()
    expect(result.data?.reviewsTransferred).toBe(1)

    // linked_at must be set
    const session = await db.query.anonymousSessions.findFirst({
      where: eq(anonymousSessions.supabaseAnonId, ids.anonUserId),
      columns: { linkedAt: true },
    })
    expect(session?.linkedAt).not.toBeNull()

    // review now belongs to new user
    const newUserReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.userId, ids.newUserId))
    expect(newUserReviews).toHaveLength(1)

    // profile created for new user
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, ids.newUserId),
      columns: { id: true, tier: true, gdprConsentAt: true },
    })
    expect(profile).not.toBeNull()
    expect(profile?.tier).toBe('free')
    expect(profile?.gdprConsentAt).not.toBeNull()
  })

  it('is idempotent — second call returns reviewsTransferred=0 without re-transferring', async () => {
    await seedReview(ids.anonUserId, ids.cardId)

    const first = await completeAnonymousUpgrade(ids.anonUserId, ids.newUserId)
    expect(first.error).toBeNull()
    expect(first.data?.reviewsTransferred).toBe(1)

    // Second call — session.linkedAt is now set → should short-circuit
    const second = await completeAnonymousUpgrade(ids.anonUserId, ids.newUserId)
    expect(second.error).toBeNull()
    expect(second.data?.reviewsTransferred).toBe(0)

    // Only one review row — not duplicated
    const rows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.userId, ids.newUserId))
    expect(rows).toHaveLength(1)
  })

  it('returns SESSION_EXPIRED error when anonymous session row does not exist', async () => {
    // No session row seeded for a fresh anonUserId
    const ghostId = ids.newUserId.replace('bbbb', 'dddd')
    const result = await completeAnonymousUpgrade(ghostId, ids.newUserId)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('SESSION_EXPIRED')
  })

  it('returns reviewsTransferred=0 when session is already linked (linked_at set)', async () => {
    const linkedAt = new Date()
    await cleanupSession(ids.anonUserId)
    await seedAnonSession(ids.anonUserId, linkedAt)

    const result = await completeAnonymousUpgrade(ids.anonUserId, ids.newUserId)

    expect(result.error).toBeNull()
    expect(result.data?.reviewsTransferred).toBe(0)

    // No reviews should have been transferred
    const newUserReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.userId, ids.newUserId))
    expect(newUserReviews).toHaveLength(0)
  })
})

// ─── Non-DB unit tests ───────────────────────────────────────────────────────

describe('completeAnonymousUpgrade — contract', () => {
  it('is importable and exports a function', () => {
    expect(typeof completeAnonymousUpgrade).toBe('function')
  })
})

describe('transferAnonymousReviews — contract', () => {
  it('is importable and exports a function', () => {
    expect(typeof transferAnonymousReviews).toBe('function')
  })
})

describe('markAnonymousSessionLinked — contract', () => {
  it('is importable and exports a function', () => {
    expect(typeof markAnonymousSessionLinked).toBe('function')
  })
})
