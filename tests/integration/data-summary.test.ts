/**
 * Integration tests for Story 2-5: GDPR Personal Data Summary
 *
 * Tests the data-transformation logic in PrivacySettingsPage: how DB profile
 * rows and count query results are mapped to DataSummarySection props.
 *
 * The RSC page function is called directly and the returned React element
 * tree is traversed to assert prop values — no real DB connection required.
 *
 * Run with: pnpm test tests/integration/data-summary.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import type { profiles } from '@/server/db/schema'

// ─── Mock declarations (must precede imports of the mocked modules) ──────────

vi.mock('@/lib/supabase/user', () => ({
  createUserClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerAdminClient: vi.fn(),
}))

vi.mock('@/server/db', () => ({
  db: { select: vi.fn() },
}))

// DataExportSection is 'use client' with hooks — mock to prevent
// hook-outside-renderer errors in a node test environment
vi.mock('@/components/privacy/DataExportSection', () => ({
  DataExportSection: vi.fn().mockReturnValue(null),
}))

// DeleteAccountSection added by Story 2-6 — mock to isolate 2-5 under test
vi.mock('@/components/privacy/DeleteAccountSection', () => ({
  DeleteAccountSection: vi.fn().mockReturnValue(null),
}))

// ─── Imports after mocks ─────────────────────────────────────────────────────

import { createUserClient } from '@/lib/supabase/user'
import { createServerAdminClient } from '@/lib/supabase/server'
import { db } from '@/server/db'
import { DataExportSection } from '@/components/privacy/DataExportSection'
import { DeleteAccountSection } from '@/components/privacy/DeleteAccountSection'
import { DataSummarySection } from '@/components/privacy/DataSummarySection'
import PrivacySettingsPage from '@/app/(app)/settings/privacy/page'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Creates a chainable Drizzle-like query mock that resolves to `result`.
 * Supports chaining: .from().where().orderBy().limit()
 * Can also be awaited directly (no terminal .limit() needed).
 */
function makeQuery(result: unknown) {
  const resolved = Promise.resolve(result)
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn().mockReturnValue(resolved),
    then: resolved.then.bind(resolved),
    catch: resolved.catch.bind(resolved),
    finally: resolved.finally.bind(resolved),
  }
  chain.from.mockReturnValue(chain)
  chain.where.mockReturnValue(chain)
  chain.orderBy.mockReturnValue(chain)
  return chain
}

/**
 * Builds a Supabase admin client mock for the sessions count chain:
 *   .schema('auth').from('sessions').select('*', ...).eq('user_id', x)
 *   → { count: sessionCount, error: null }
 */
function makeMockAdminClient(sessionCount: number | null = 3) {
  const eqFn = vi.fn().mockResolvedValue({ count: sessionCount, error: null })
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn })
  const fromFn = vi.fn().mockReturnValue({ select: selectFn })
  const schemaFn = vi.fn().mockReturnValue({ from: fromFn })

  return {
    schema: schemaFn,
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({ data: null }),
      }),
    },
  }
}

/**
 * Authenticated user mock.
 * `created_at` is the Supabase auth.users field used as a createdAt fallback
 * when the profiles row is absent — must be present in the mock.
 */
function makeAuthenticatedUser(id = 'user-abc', createdAt = '2024-01-01T00:00:00Z') {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id, email: 'user@example.com', created_at: createdAt } },
        error: null,
      }),
    },
  }
}

/** Default profile row typed against the Drizzle schema to catch column changes. */
const defaultProfile: typeof profiles.$inferSelect = {
  id: 'user-abc',
  displayName: 'Alice',
  tier: 'free',
  previousTier: null,
  isAdmin: false,
  avatarUrl: null,
  gdprConsentAt: new Date('2024-01-15'),
  createdAt: new Date('2024-01-01'),
  deletedAt: null,
  formatPreferences: null,
  userFsrsParams: null,
}

/**
 * Sets up db.select() with 6 mockReturnValueOnce calls matching the
 * Promise.all query order in PrivacySettingsPage:
 *   1. dataExportJobs
 *   2. profiles
 *   3. decks count
 *   4. notes count
 *   5. cards count
 *   6. reviews count
 *
 * IMPORTANT: This order must match the Promise.all array in page.tsx exactly.
 * If queries are reordered in the page, update these calls in the same order.
 *
 * Resets db.select before queuing — safe to call multiple times per test
 * without accumulating stale queue entries. Only resets db.select, not other mocks.
 */
function setupDbMocks(overrides: {
  jobs?: unknown[]
  profiles?: unknown[]
  deckCount?: number
  noteCount?: number
  cardCount?: number
  reviewCount?: number
} = {}) {
  const {
    jobs = [],
    profiles = [defaultProfile],
    deckCount = 3,
    noteCount = 5,
    cardCount = 12,
    reviewCount = 50,
  } = overrides

  vi.mocked(db.select).mockReset()

  vi.mocked(db.select)
    .mockReturnValueOnce(makeQuery(jobs) as never)
    .mockReturnValueOnce(makeQuery(profiles) as never)
    .mockReturnValueOnce(makeQuery([{ deckCount }]) as never)
    .mockReturnValueOnce(makeQuery([{ noteCount }]) as never)
    .mockReturnValueOnce(makeQuery([{ cardCount }]) as never)
    .mockReturnValueOnce(makeQuery([{ reviewCount }]) as never)
}

/**
 * Traverses a React element tree (plain object) to find the first element
 * whose `type` matches the given component reference.
 */
function findElementByType(node: React.ReactNode, type: unknown): React.ReactElement | null {
  if (!node || typeof node !== 'object') return null
  const el = node as React.ReactElement
  if (el.type === type) return el
  const children = (el.props as { children?: React.ReactNode })?.children
  if (!children) return null
  const childArray: React.ReactNode[] = Array.isArray(children) ? children : [children]
  for (const child of childArray) {
    const found = findElementByType(child, type)
    if (found) return found
  }
  return null
}

/** Calls the page and extracts DataSummarySection props from the element tree */
async function getDataSummaryProps() {
  const element = await PrivacySettingsPage()
  const found = findElementByType(element as React.ReactNode, DataSummarySection)
  if (!found) throw new Error('DataSummarySection element not found in page output')
  return found.props as {
    profile: {
      displayName: string | null
      tier: string
      gdprConsentAt: Date | null
      createdAt: Date
      hasFormatPreferences: boolean
      hasCustomFsrsParams: boolean
    }
    counts: {
      decks: number
      notes: number
      cards: number
      reviews: number
      activeSessions: number
    }
  }
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) clears mockReturnValueOnce queues between
  // tests, preventing stale queue entries from leaking if a previous test fails.
  vi.resetAllMocks()

  // Re-apply component mocks after reset (resetAllMocks clears mockReturnValue too)
  vi.mocked(DataExportSection).mockReturnValue(null)
  vi.mocked(DeleteAccountSection).mockReturnValue(null)

  vi.mocked(createUserClient).mockResolvedValue(makeAuthenticatedUser() as never)
  vi.mocked(createServerAdminClient).mockReturnValue(makeMockAdminClient() as never)
  setupDbMocks()
})

// ─── Learning Fingerprint mapping ────────────────────────────────────────────

describe('hasFormatPreferences mapping', () => {
  it('is false when formatPreferences is null', async () => {
    const props = await getDataSummaryProps()
    expect(props.profile.hasFormatPreferences).toBe(false)
  })

  it('is false when formatPreferences is undefined', async () => {
    setupDbMocks({ profiles: [{ ...defaultProfile, formatPreferences: undefined }] })

    const props = await getDataSummaryProps()
    expect(props.profile.hasFormatPreferences).toBe(false)
  })

  it('is true when formatPreferences has a value', async () => {
    setupDbMocks({ profiles: [{ ...defaultProfile, formatPreferences: { qa: 0.5 } }] })

    const props = await getDataSummaryProps()
    expect(props.profile.hasFormatPreferences).toBe(true)
  })
})

describe('hasCustomFsrsParams mapping', () => {
  it('is false when userFsrsParams is null', async () => {
    const props = await getDataSummaryProps()
    expect(props.profile.hasCustomFsrsParams).toBe(false)
  })

  it('is true when userFsrsParams has a value', async () => {
    setupDbMocks({ profiles: [{ ...defaultProfile, userFsrsParams: [{ difficulty: 5 }] }] })

    const props = await getDataSummaryProps()
    expect(props.profile.hasCustomFsrsParams).toBe(true)
  })
})

// ─── Count query mapping ──────────────────────────────────────────────────────

describe('count queries', () => {
  it('passes deck count from DB to DataSummarySection', async () => {
    setupDbMocks({ deckCount: 7 })
    const props = await getDataSummaryProps()
    expect(props.counts.decks).toBe(7)
  })

  it('passes notes count from DB to DataSummarySection', async () => {
    setupDbMocks({ noteCount: 11 })
    const props = await getDataSummaryProps()
    expect(props.counts.notes).toBe(11)
  })

  it('passes card count from DB to DataSummarySection', async () => {
    setupDbMocks({ cardCount: 99 })
    const props = await getDataSummaryProps()
    expect(props.counts.cards).toBe(99)
  })

  it('passes review count from DB to DataSummarySection', async () => {
    setupDbMocks({ reviewCount: 200 })
    const props = await getDataSummaryProps()
    expect(props.counts.reviews).toBe(200)
  })
})

// ─── Session count ────────────────────────────────────────────────────────────

describe('active session count', () => {
  it('passes session count from admin client to DataSummarySection', async () => {
    vi.mocked(createServerAdminClient).mockReturnValue(makeMockAdminClient(3) as never)

    const props = await getDataSummaryProps()
    expect(props.counts.activeSessions).toBe(3)
  })

  it('falls back to 0 when sessionsResult.count is null', async () => {
    vi.mocked(createServerAdminClient).mockReturnValue(makeMockAdminClient(null) as never)

    const props = await getDataSummaryProps()
    expect(props.counts.activeSessions).toBe(0)
  })
})

// ─── createdAt fallback ───────────────────────────────────────────────────────

describe('createdAt fallback', () => {
  it('uses user.created_at when the profiles row is absent', async () => {
    const signupDate = '2023-06-15T12:00:00Z'
    vi.mocked(createUserClient).mockResolvedValue(
      makeAuthenticatedUser('user-abc', signupDate) as never
    )
    setupDbMocks({ profiles: [] }) // simulate missing profile row

    const props = await getDataSummaryProps()
    expect(props.profile.createdAt).toEqual(new Date(signupDate))
  })

  it('uses profileRow.createdAt when the profiles row is present', async () => {
    const profileDate = new Date('2024-01-01')
    // defaultProfile already has createdAt = 2024-01-01; user.created_at differs
    vi.mocked(createUserClient).mockResolvedValue(
      makeAuthenticatedUser('user-abc', '2023-01-01T00:00:00Z') as never
    )

    const props = await getDataSummaryProps()
    expect(props.profile.createdAt).toEqual(profileDate)
  })
})

// ─── Contract tests ───────────────────────────────────────────────────────────

describe('PrivacySettingsPage — contract', () => {
  it('is importable and exports a function', () => {
    expect(typeof PrivacySettingsPage).toBe('function')
  })

  it('renders DataSummarySection in the page output', async () => {
    const element = await PrivacySettingsPage()
    const found = findElementByType(element as React.ReactNode, DataSummarySection)
    expect(found).not.toBeNull()
  })
})
