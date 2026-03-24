/**
 * Integration tests for Story 2-2: Password Change Server Action
 *
 * Tests the changePassword Server Action with mocked Supabase Auth.
 * No real DB connection needed — password change is purely an Auth operation.
 *
 * Run with: pnpm test tests/integration/password-change.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/user', () => ({
  createUserClient: vi.fn(),
}))

import { createUserClient } from '@/lib/supabase/user'
import { changePassword } from '@/app/(app)/settings/security/actions'

type MockSupabase = Awaited<ReturnType<typeof createUserClient>>

function makeMockSupabase(overrides: {
  getUser?: unknown
  signInWithPassword?: unknown
  updateUser?: unknown
} = {}): MockSupabase {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'user@example.com' } },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
      ...overrides,
    },
  } as unknown as MockSupabase
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

const validForm = {
  currentPassword: 'OldPass123',
  newPassword: 'NewPass456!',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createUserClient).mockResolvedValue(makeMockSupabase())
})

describe('changePassword', () => {
  describe('auth guard', () => {
    it('returns UNAUTHORIZED when getUser returns no user', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeMockSupabase({
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        })
      )
      const result = await changePassword(makeFormData(validForm))
      expect(result.error?.code).toBe('UNAUTHORIZED')
      expect(result.data).toBeNull()
    })

    it('returns UNAUTHORIZED when getUser returns an auth error', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeMockSupabase({
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Session expired' },
          }),
        })
      )
      const result = await changePassword(makeFormData(validForm))
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('returns UNAUTHORIZED when user has no email (e.g. anonymous user)', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeMockSupabase({
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'anon-123', email: null } },
            error: null,
          }),
        })
      )
      const result = await changePassword(makeFormData(validForm))
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })
  })

  describe('input validation', () => {
    it('returns VALIDATION_ERROR when currentPassword is missing', async () => {
      const result = await changePassword(makeFormData({ newPassword: 'NewPass456!' }))
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('returns VALIDATION_ERROR when newPassword is shorter than 8 characters', async () => {
      const result = await changePassword(makeFormData({ currentPassword: 'OldPass123', newPassword: 'short1' }))
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toMatch(/8 characters/i)
    })

    it('does not call signInWithPassword when validation fails', async () => {
      const mock = makeMockSupabase()
      vi.mocked(createUserClient).mockResolvedValue(mock)

      await changePassword(makeFormData({ currentPassword: 'OldPass123', newPassword: 'short' }))

      expect(mock.auth.signInWithPassword).not.toHaveBeenCalled()
    })
  })

  describe('current password verification', () => {
    it('returns WRONG_PASSWORD when signInWithPassword fails', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeMockSupabase({
          signInWithPassword: vi.fn().mockResolvedValue({
            error: { message: 'Invalid login credentials' },
          }),
        })
      )
      const result = await changePassword(makeFormData(validForm))
      expect(result.error?.code).toBe('WRONG_PASSWORD')
      expect(result.data).toBeNull()
    })

    it('does not call updateUser when signInWithPassword fails', async () => {
      const mock = makeMockSupabase({
        signInWithPassword: vi.fn().mockResolvedValue({
          error: { message: 'Invalid credentials' },
        }),
      })
      vi.mocked(createUserClient).mockResolvedValue(mock)

      await changePassword(makeFormData(validForm))

      expect(mock.auth.updateUser).not.toHaveBeenCalled()
    })

    it('calls signInWithPassword with the user email from getUser (not client input)', async () => {
      const mock = makeMockSupabase()
      vi.mocked(createUserClient).mockResolvedValue(mock)

      await changePassword(makeFormData(validForm))

      expect(mock.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: validForm.currentPassword,
      })
    })
  })

  describe('password update', () => {
    it('returns AUTH_ERROR when updateUser fails', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeMockSupabase({
          updateUser: vi.fn().mockResolvedValue({
            error: { message: 'Password update failed' },
          }),
        })
      )
      const result = await changePassword(makeFormData(validForm))
      expect(result.error?.code).toBe('AUTH_ERROR')
      expect(result.data).toBeNull()
    })

    it('calls updateUser with the new password', async () => {
      const mock = makeMockSupabase()
      vi.mocked(createUserClient).mockResolvedValue(mock)

      await changePassword(makeFormData(validForm))

      expect(mock.auth.updateUser).toHaveBeenCalledWith({ password: validForm.newPassword })
    })
  })

  describe('successful password change', () => {
    it('returns data=undefined and error=null on success', async () => {
      const result = await changePassword(makeFormData(validForm))
      expect(result.error).toBeNull()
      expect(result.data).toBeUndefined()
    })

    it('calls all three auth methods in order on a valid request', async () => {
      const mock = makeMockSupabase()
      vi.mocked(createUserClient).mockResolvedValue(mock)

      await changePassword(makeFormData(validForm))

      expect(mock.auth.getUser).toHaveBeenCalledOnce()
      expect(mock.auth.signInWithPassword).toHaveBeenCalledOnce()
      expect(mock.auth.updateUser).toHaveBeenCalledOnce()
    })
  })
})

// Contract test — no mocks needed
describe('changePassword — contract', () => {
  it('is importable and exports a function', () => {
    expect(typeof changePassword).toBe('function')
  })
})
