/**
 * Integration tests for Story 2-6: Account Deletion Request
 *
 * Tests the deleteAccount Server Action with all external dependencies mocked.
 * Covers auth guard, transaction success/failure, session invalidation, and email.
 *
 * Run with: pnpm test tests/integration/account-deletion.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoisted mock factories (defined before vi.mock hoisting runs) ────────────

const { mockTx, mockDb } = vi.hoisted(() => {
  const mockTx = {
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockReturnThis(),
  }
  const mockDb = {
    transaction: vi.fn().mockImplementation(async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
  }
  return { mockTx, mockDb }
})

// ─── Mock declarations (must precede imports of the mocked modules) ──────────

vi.mock('@/lib/supabase/user', () => ({
  createUserClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerAdminClient: vi.fn(),
}))

vi.mock('@/server/email', () => ({
  sendEmail: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  log: vi.fn(),
}))

vi.mock('@/server/db', () => ({ db: mockDb }))

// ─── Imports after mocks ─────────────────────────────────────────────────────

import { createUserClient } from '@/lib/supabase/user'
import { createServerAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/server/email'
import { log } from '@/lib/logger'
import { deleteAccount } from '@/app/(app)/settings/privacy/actions'

// ─── Mock factories ───────────────────────────────────────────────────────────

const mockAdminSignOut = vi.fn().mockResolvedValue({ error: null })
const mockAdminClient = {
  auth: { admin: { signOut: mockAdminSignOut } },
}

function makeAuthenticatedUser(overrides: { id?: string; email?: string; displayName?: string } = {}) {
  const { id = 'user-abc', email = 'user@example.com', displayName = 'Alice' } = overrides
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id,
            email,
            user_metadata: { display_name: displayName },
          },
        },
        error: null,
      }),
    },
  }
}

function makeUnauthenticatedClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      }),
    },
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset transaction to success by default
    mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx))
    mockTx.update.mockReturnThis()
    mockTx.set.mockReturnThis()
    mockTx.where.mockResolvedValue(undefined)
    mockTx.delete.mockReturnThis()
    mockAdminSignOut.mockResolvedValue({ error: null })
    vi.mocked(createServerAdminClient).mockReturnValue(mockAdminClient as unknown as ReturnType<typeof createServerAdminClient>)
    vi.mocked(sendEmail).mockResolvedValue({ error: null })
  })

  describe('auth guard', () => {
    it('returns UNAUTHORIZED when getUser() returns null user', async () => {
      vi.mocked(createUserClient).mockResolvedValue(makeUnauthenticatedClient() as unknown as Awaited<ReturnType<typeof createUserClient>>)

      const result = await deleteAccount()

      expect(result.error?.code).toBe('UNAUTHORIZED')
      expect(result.data).toBeNull()
      expect(mockDb.transaction).not.toHaveBeenCalled()
    })

    it('returns UNAUTHORIZED when getUser() returns an error', async () => {
      vi.mocked(createUserClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('auth error') }),
        },
      } as unknown as Awaited<ReturnType<typeof createUserClient>>)

      const result = await deleteAccount()

      expect(result.error?.code).toBe('UNAUTHORIZED')
      expect(mockDb.transaction).not.toHaveBeenCalled()
    })
  })

  describe('deletion transaction', () => {
    it('executes all four DB operations within a transaction on success', async () => {
      vi.mocked(createUserClient).mockResolvedValue(makeAuthenticatedUser() as unknown as Awaited<ReturnType<typeof createUserClient>>)

      await deleteAccount()

      expect(mockDb.transaction).toHaveBeenCalledOnce()
      // update called three times: decks, notes, profiles
      expect(mockTx.update).toHaveBeenCalledTimes(3)
      // delete called once: reviews
      expect(mockTx.delete).toHaveBeenCalledOnce()
    })

    it('returns DELETION_FAILED and logs when transaction throws', async () => {
      vi.mocked(createUserClient).mockResolvedValue(makeAuthenticatedUser() as unknown as Awaited<ReturnType<typeof createUserClient>>)
      mockDb.transaction.mockRejectedValue(new Error('DB connection lost'))

      const result = await deleteAccount()

      expect(result.error?.code).toBe('DELETION_FAILED')
      expect(result.data).toBeNull()
      expect(vi.mocked(log)).toHaveBeenCalledWith(expect.objectContaining({ action: 'gdpr.delete.transaction_failed' }))
    })

    it('does NOT call adminClient.signOut when transaction fails', async () => {
      vi.mocked(createUserClient).mockResolvedValue(makeAuthenticatedUser() as unknown as Awaited<ReturnType<typeof createUserClient>>)
      mockDb.transaction.mockRejectedValue(new Error('DB error'))

      await deleteAccount()

      expect(mockAdminSignOut).not.toHaveBeenCalled()
    })
  })

  describe('session invalidation', () => {
    it('calls admin.signOut with the correct userId and global scope after transaction succeeds', async () => {
      vi.mocked(createUserClient).mockResolvedValue(makeAuthenticatedUser({ id: 'uid-123' }) as unknown as Awaited<ReturnType<typeof createUserClient>>)

      await deleteAccount()

      expect(mockAdminSignOut).toHaveBeenCalledWith('uid-123', 'global')
    })

    it('returns success and logs when signOut fails (non-fatal)', async () => {
      vi.mocked(createUserClient).mockResolvedValue(makeAuthenticatedUser() as unknown as Awaited<ReturnType<typeof createUserClient>>)
      mockAdminSignOut.mockResolvedValue({ error: new Error('Supabase admin error') })

      const result = await deleteAccount()

      expect(result.error).toBeNull()
      expect(vi.mocked(log)).toHaveBeenCalledWith(expect.objectContaining({ action: 'gdpr.delete.signout_failed' }))
    })
  })

  describe('deletion email', () => {
    it('sends deletion confirmation email with correct to and subject after success', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeAuthenticatedUser({ email: 'alice@example.com', displayName: 'Alice' }) as unknown as Awaited<ReturnType<typeof createUserClient>>,
      )

      await deleteAccount()

      expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
        expect.anything(), // React element — template content
        'alice@example.com',
        'Your Flashcards account has been deleted',
      )
    })

    it('returns success even when email send fails (non-fatal)', async () => {
      vi.mocked(createUserClient).mockResolvedValue(makeAuthenticatedUser() as unknown as Awaited<ReturnType<typeof createUserClient>>)
      vi.mocked(sendEmail).mockResolvedValue({ error: 'SMTP error' })

      const result = await deleteAccount()

      expect(result.error).toBeNull()
      expect(result.data).toBeUndefined()
      expect(vi.mocked(log)).toHaveBeenCalledWith(expect.objectContaining({ action: 'gdpr.delete.email_failed' }))
    })

    it('skips email send when user has no email address', async () => {
      vi.mocked(createUserClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: { id: 'uid-noemail', email: null, user_metadata: {} },
            },
            error: null,
          }),
        },
      } as unknown as Awaited<ReturnType<typeof createUserClient>>)

      const result = await deleteAccount()

      expect(result.error).toBeNull()
      expect(vi.mocked(sendEmail)).not.toHaveBeenCalled()
    })
  })

  describe('success', () => {
    it('returns { data: undefined, error: null } on full success', async () => {
      vi.mocked(createUserClient).mockResolvedValue(makeAuthenticatedUser() as unknown as Awaited<ReturnType<typeof createUserClient>>)

      const result = await deleteAccount()

      expect(result.error).toBeNull()
      expect(result.data).toBeUndefined()
    })
  })
})
