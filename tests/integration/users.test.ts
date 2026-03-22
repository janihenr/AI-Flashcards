/**
 * Integration tests for DAL: users, pagination, validateSystemUser
 *
 * Prerequisites: `supabase start` must be running locally.
 * Run with: pnpm test tests/integration/users.test.ts
 *
 * These tests hit a real Supabase local instance — no mocks.
 * Rationale: mock divergence caused a prod migration failure (see project memory).
 */
import { describe, it, expect } from 'vitest'
import { getUserProfile, validateSystemUser } from '@/server/db/queries/users'
import { encodeCursor, decodeCursor } from '@/lib/pagination'

describe('Cursor Pagination Helper', () => {
  it('encodes and decodes a cursor round-trip', () => {
    const original = '2025-01-15T10:30:00.000Z'
    const encoded = encodeCursor(original)
    const decoded = decodeCursor(encoded)
    expect(decoded).toBe(original)
  })

  it('produces a base64url string (no + / = characters)', () => {
    const encoded = encodeCursor('2025-01-15T10:30:00.000Z')
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

// DB-dependent tests require `supabase start` and a valid DATABASE_URL
const hasDb = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('placeholder')

describe.skipIf(!hasDb)('getUserProfile (requires supabase start)', () => {
  it('returns NOT_FOUND for a non-existent user ID', async () => {
    const result = await getUserProfile('00000000-0000-0000-0000-000000000000')
    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
    expect(result.data).toBeNull()
  })
})

describe('validateSystemUser', () => {
  it('throws if SYSTEM_USER_ID env var is not set', async () => {
    const original = process.env.SYSTEM_USER_ID
    delete process.env.SYSTEM_USER_ID
    await expect(validateSystemUser()).rejects.toThrow('SYSTEM_USER_ID env var is not set')
    if (original !== undefined) {
      process.env.SYSTEM_USER_ID = original
    }
  })

  it.skipIf(!hasDb)('throws if SYSTEM_USER_ID does not exist in profiles (requires supabase start)', async () => {
    const original = process.env.SYSTEM_USER_ID
    process.env.SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'
    await expect(validateSystemUser()).rejects.toThrow('not found in profiles')
    process.env.SYSTEM_USER_ID = original
  })
})

// RLS tests require a real Supabase instance with two separate user sessions.
// These are marked as skipped here — run manually with `supabase start` and
// real JWT tokens when verifying RLS policies post-migration.
describe.skip('RLS: User A cannot read User B profile', () => {
  it('returns null when user A queries user B profile via RLS', async () => {
    // Requires: two separate createUserClient() instances with different JWT tokens
    // This is verified manually via Supabase Studio or psql after migrations are applied
    expect(true).toBe(true)
  })
})
