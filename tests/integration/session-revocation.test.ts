/**
 * Integration tests for Story 2-3: Active Session View & Revocation
 *
 * Tests the revokeSession and revokeOtherSessions Server Actions with mocked
 * Supabase clients. No real DB connection needed — all operations are
 * Supabase Auth-layer only.
 *
 * Run with: pnpm test tests/integration/session-revocation.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock declarations (must precede imports of the mocked modules) ──────────

vi.mock('@/lib/supabase/user', () => ({
  createUserClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerAdminClient: vi.fn(),
}))

import { createUserClient } from '@/lib/supabase/user'
import { createServerAdminClient } from '@/lib/supabase/server'
import { revokeSession, revokeOtherSessions } from '@/app/(app)/settings/security/actions'

// ─── Type helpers ────────────────────────────────────────────────────────────

type MockUserClient = {
  auth: {
    getUser: ReturnType<typeof vi.fn>
    getSession: ReturnType<typeof vi.fn>
    signOut: ReturnType<typeof vi.fn>
  }
}

type MockAdminClient = {
  schema: ReturnType<typeof vi.fn>
}

// ─── Mock factories ──────────────────────────────────────────────────────────

function makeMockUserClient(overrides: Partial<MockUserClient['auth']> = {}): MockUserClient {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-abc', email: 'user@example.com' } },
        error: null,
      }),
      // Return null session by default — self-revocation guard finds no current session to compare
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      ...overrides,
    },
  }
}

/**
 * Builds an admin client mock that chains:
 *   .schema('auth').from('sessions').delete().eq('id', x).eq('user_id', y).select('id')
 *   → { data: deletedRows, error: deleteError }
 */
function makeMockAdminClient(options: {
  deletedRows?: Array<{ id: string }>
  deleteError?: { message: string } | null
} = {}): MockAdminClient {
  const { deletedRows = [{ id: 'session-123' }], deleteError = null } = options

  const selectAfterDelete = vi.fn().mockResolvedValue({
    data: deletedRows,
    error: deleteError,
  })
  // Declare first, then set mockReturnValue to avoid TDZ circular reference
  const eqFn: ReturnType<typeof vi.fn> = vi.fn()
  eqFn.mockReturnValue({ eq: eqFn, select: selectAfterDelete })
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn })
  const fromFn = vi.fn().mockReturnValue({ delete: deleteFn })
  const schemaFn = vi.fn().mockReturnValue({ from: fromFn })

  return { schema: schemaFn }
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createUserClient).mockResolvedValue(makeMockUserClient() as never)
  vi.mocked(createServerAdminClient).mockReturnValue(makeMockAdminClient() as never)
})

// ─── revokeSession ───────────────────────────────────────────────────────────

describe('revokeSession', () => {
  describe('auth guard', () => {
    it('returns UNAUTHORIZED when getUser returns no user', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeMockUserClient({
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        }) as never
      )

      const result = await revokeSession('session-123')

      expect(result.error?.code).toBe('UNAUTHORIZED')
      expect(result.data).toBeNull()
    })

    it('returns UNAUTHORIZED when getUser returns an auth error', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeMockUserClient({
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Session expired' },
          }),
        }) as never
      )

      const result = await revokeSession('session-123')

      expect(result.error?.code).toBe('UNAUTHORIZED')
    })
  })

  describe('session ownership', () => {
    it('returns NOT_FOUND when session does not belong to the authenticated user', async () => {
      vi.mocked(createServerAdminClient).mockReturnValue(
        makeMockAdminClient({ deletedRows: [] }) as never
      )

      const result = await revokeSession('session-belonging-to-another-user')

      expect(result.error?.code).toBe('NOT_FOUND')
      expect(result.data).toBeNull()
    })
  })

  describe('delete failure', () => {
    it('returns AUTH_ERROR when the delete query returns an error', async () => {
      vi.mocked(createServerAdminClient).mockReturnValue(
        makeMockAdminClient({
          deletedRows: null as never,
          deleteError: { message: 'insufficient privilege' },
        }) as never
      )

      const result = await revokeSession('session-123')

      expect(result.error?.code).toBe('AUTH_ERROR')
      expect(result.data).toBeNull()
    })
  })

  describe('success', () => {
    it('returns { data: undefined, error: null } when session is successfully revoked', async () => {
      const result = await revokeSession('session-123')

      expect(result.error).toBeNull()
      expect(result.data).toBeUndefined()
    })

    it('passes sessionId and userId as eq conditions to ensure ownership at DB level', async () => {
      const adminMock = makeMockAdminClient()
      vi.mocked(createServerAdminClient).mockReturnValue(adminMock as never)

      await revokeSession('session-to-delete')

      // Verify full chain: .schema('auth').from('sessions')
      expect(adminMock.schema).toHaveBeenCalledWith('auth')
      const fromFn = adminMock.schema.mock.results[0]?.value?.from
      expect(fromFn).toHaveBeenCalledWith('sessions')

      // Verify eq() was called with sessionId and userId (IDOR prevention)
      const deleteFn = fromFn.mock.results[0]?.value?.delete
      const eqFn = deleteFn.mock.results[0]?.value?.eq
      const eqCalls = eqFn.mock.calls as Array<[string, string]>
      expect(eqCalls).toContainEqual(['id', 'session-to-delete'])
      expect(eqCalls).toContainEqual(['user_id', 'user-abc'])
    })

    it('does not call admin client when user is not authenticated', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeMockUserClient({
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        }) as never
      )
      const adminMock = makeMockAdminClient()
      vi.mocked(createServerAdminClient).mockReturnValue(adminMock as never)

      await revokeSession('session-123')

      expect(adminMock.schema).not.toHaveBeenCalled()
    })
  })
})

// ─── revokeOtherSessions ─────────────────────────────────────────────────────

describe('revokeOtherSessions', () => {
  describe('auth guard', () => {
    it('returns UNAUTHORIZED when getUser returns no user', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeMockUserClient({
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        }) as never
      )

      const result = await revokeOtherSessions()

      expect(result.error?.code).toBe('UNAUTHORIZED')
      expect(result.data).toBeNull()
    })

    it('returns UNAUTHORIZED when getUser returns an auth error', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeMockUserClient({
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Session expired' },
          }),
        }) as never
      )

      const result = await revokeOtherSessions()

      expect(result.error?.code).toBe('UNAUTHORIZED')
    })
  })

  describe('signOut failure', () => {
    it('returns AUTH_ERROR when signOut returns an error', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeMockUserClient({
          signOut: vi.fn().mockResolvedValue({ error: { message: 'signOut failed' } }),
        }) as never
      )

      const result = await revokeOtherSessions()

      expect(result.error?.code).toBe('AUTH_ERROR')
      expect(result.data).toBeNull()
    })
  })

  describe('success', () => {
    it('returns { data: undefined, error: null } on success', async () => {
      const result = await revokeOtherSessions()

      expect(result.error).toBeNull()
      expect(result.data).toBeUndefined()
    })

    it('calls signOut with scope "others" to preserve current session', async () => {
      const mockClient = makeMockUserClient()
      vi.mocked(createUserClient).mockResolvedValue(mockClient as never)

      await revokeOtherSessions()

      expect(mockClient.auth.signOut).toHaveBeenCalledWith({ scope: 'others' })
    })

    it('does not call signOut when user is not authenticated', async () => {
      const mockClient = makeMockUserClient({
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      })
      vi.mocked(createUserClient).mockResolvedValue(mockClient as never)

      await revokeOtherSessions()

      expect(mockClient.auth.signOut).not.toHaveBeenCalled()
    })
  })
})

// ─── Contract tests ───────────────────────────────────────────────────────────

describe('revokeSession — contract', () => {
  it('is importable and exports a function', () => {
    expect(typeof revokeSession).toBe('function')
  })
})

describe('revokeOtherSessions — contract', () => {
  it('is importable and exports a function', () => {
    expect(typeof revokeOtherSessions).toBe('function')
  })
})
