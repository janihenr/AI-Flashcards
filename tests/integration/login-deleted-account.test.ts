/**
 * Integration tests for Story 2-6: deleted-account guard in signInWithEmail
 *
 * Verifies that a soft-deleted account is blocked at the login Server Action
 * and the session is immediately signed out.
 *
 * Run with: pnpm test tests/integration/login-deleted-account.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoisted mock factories ───────────────────────────────────────────────────

const { mockSelectDb } = vi.hoisted(() => {
  const mockSelectDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]), // default: profile not found (new user path)
  }
  return { mockSelectDb }
})

// ─── Mock declarations ────────────────────────────────────────────────────────

vi.mock('@/server/db', () => ({ db: mockSelectDb }))

vi.mock('@/lib/supabase/user', () => ({
  createUserClient: vi.fn(),
}))

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { createUserClient } from '@/lib/supabase/user'
import { signInWithEmail } from '@/app/(auth)/login/actions'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSuccessfulSignIn(userId = 'user-abc') {
  const mockSignOut = vi.fn().mockResolvedValue({ error: null })
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: userId }, session: {} },
        error: null,
      }),
      signOut: mockSignOut,
    },
    _mockSignOut: mockSignOut,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('signInWithEmail — deleted account guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectDb.select.mockReturnThis()
    mockSelectDb.from.mockReturnThis()
    mockSelectDb.where.mockReturnThis()
    mockSelectDb.limit.mockResolvedValue([]) // default: active account (no deletedAt)
  })

  it('allows login when profile has deletedAt = null', async () => {
    const client = makeSuccessfulSignIn()
    vi.mocked(createUserClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createUserClient>>)
    mockSelectDb.limit.mockResolvedValue([{ deletedAt: null }])

    const result = await signInWithEmail('user@example.com', 'password123')

    expect(result.error).toBeNull()
    expect(result.data?.redirectUrl).toBe('/decks')
    expect(client._mockSignOut).not.toHaveBeenCalled()
  })

  it('allows login when profile row is missing (new user before profile creation)', async () => {
    const client = makeSuccessfulSignIn()
    vi.mocked(createUserClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createUserClient>>)
    mockSelectDb.limit.mockResolvedValue([]) // no profile row yet

    const result = await signInWithEmail('new@example.com', 'password123')

    expect(result.error).toBeNull()
    expect(client._mockSignOut).not.toHaveBeenCalled()
  })

  it('blocks login and signs out when profile has a deletedAt date', async () => {
    const client = makeSuccessfulSignIn('deleted-user-id')
    vi.mocked(createUserClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createUserClient>>)
    mockSelectDb.limit.mockResolvedValue([{ deletedAt: new Date('2026-03-24T10:00:00Z') }])

    const result = await signInWithEmail('deleted@example.com', 'password123')

    expect(result.error?.code).toBe('ACCOUNT_DELETED')
    expect(result.data).toBeNull()
    expect(client._mockSignOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('returns generic error for wrong credentials (no account enumeration)', async () => {
    vi.mocked(createUserClient).mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: new Error('Invalid credentials'),
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createUserClient>>)

    const result = await signInWithEmail('someone@example.com', 'wrongpassword')

    expect(result.error?.code).toBe('AUTH_INVALID_CREDENTIALS')
    expect(result.error?.message).toBe('Invalid email or password')
  })
})
