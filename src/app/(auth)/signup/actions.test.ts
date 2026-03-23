/**
 * Unit tests for signup Server Action input validation logic.
 *
 * Tests that all validation guards (ToS, email, password) return the correct
 * Result<T> shape without needing a live Supabase connection.
 *
 * The Supabase call itself is integration-tested separately.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock createUserClient so tests don't need a live Supabase connection
vi.mock('@/lib/supabase/user', () => ({
  createUserClient: vi.fn(),
}))

// Mock next/headers cookies — signInWithGoogle sets tos_accepted cookie server-side
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }),
}))

import { createUserClient } from '@/lib/supabase/user'
import { signUpWithEmail, signInWithGoogle } from './actions'

type MockSupabase = Awaited<ReturnType<typeof createUserClient>>

function makeMockSupabase(overrides: Record<string, unknown> = {}): MockSupabase {
  return {
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: { user: { identities: [{}] } }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://accounts.google.com/oauth' }, error: null }),
      ...overrides,
    },
  } as unknown as MockSupabase
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  vi.mocked(createUserClient).mockResolvedValue(makeMockSupabase())
})

describe('signUpWithEmail', () => {
  describe('ToS validation guard', () => {
    it('returns TOS_NOT_ACCEPTED error when tosAccepted is false', async () => {
      const result = await signUpWithEmail('user@example.com', 'ValidPass1', false)
      expect(result.error?.code).toBe('TOS_NOT_ACCEPTED')
      expect(result.data).toBeNull()
    })

    it('does not call Supabase when ToS is not accepted', async () => {
      await signUpWithEmail('user@example.com', 'ValidPass1', false)
      expect(createUserClient).not.toHaveBeenCalled()
    })
  })

  describe('email/password validation', () => {
    it('returns VALIDATION_ERROR for invalid email', async () => {
      const result = await signUpWithEmail('not-an-email', 'ValidPass1', true)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('returns VALIDATION_ERROR for password shorter than 8 chars', async () => {
      const result = await signUpWithEmail('user@example.com', 'short', true)
      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toMatch(/8 characters/i)
    })

    it('does not call Supabase when validation fails', async () => {
      await signUpWithEmail('user@example.com', 'short', true)
      expect(createUserClient).not.toHaveBeenCalled()
    })
  })

  describe('successful signup', () => {
    it('returns check-email message on success', async () => {
      const result = await signUpWithEmail('user@example.com', 'ValidPass123!', true)
      expect(result.error).toBeNull()
      expect(result.data?.message).toMatch(/check your email/i)
    })

    it('returns same message for duplicate email (enumeration protection)', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeMockSupabase({
          signUp: vi.fn().mockResolvedValue({
            data: { user: { identities: [] } }, // empty identities = duplicate email
            error: null,
          }),
        })
      )
      const result = await signUpWithEmail('existing@example.com', 'ValidPass123!', true)
      expect(result.error).toBeNull()
      expect(result.data?.message).toMatch(/check your email/i)
    })

    it('returns error when Supabase signUp fails', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeMockSupabase({
          signUp: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'User already registered' },
          }),
        })
      )
      const result = await signUpWithEmail('user@example.com', 'ValidPass123!', true)
      expect(result.error).not.toBeNull()
    })
  })
})

describe('signInWithGoogle', () => {
  it('returns TOS_NOT_ACCEPTED when tosAccepted is false', async () => {
    const result = await signInWithGoogle(false)
    expect(result.error?.code).toBe('TOS_NOT_ACCEPTED')
    expect(result.data).toBeNull()
  })

  it('does not call Supabase when tosAccepted is false', async () => {
    await signInWithGoogle(false)
    expect(createUserClient).not.toHaveBeenCalled()
  })

  it('returns the OAuth URL from Supabase', async () => {
    const result = await signInWithGoogle(true)
    expect(result.error).toBeNull()
    expect(result.data?.url).toContain('accounts.google.com')
  })

  it('returns CONFIG_ERROR when NEXT_PUBLIC_APP_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const result = await signInWithGoogle(true)
    expect(result.error?.code).toBe('CONFIG_ERROR')
  })

  it('returns AUTH_ERROR when Supabase returns no URL', async () => {
    vi.mocked(createUserClient).mockResolvedValue(
      makeMockSupabase({
        signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: null }, error: null }),
      })
    )
    const result = await signInWithGoogle(true)
    expect(result.error?.code).toBe('AUTH_ERROR')
  })

  it('returns error when Supabase OAuth fails', async () => {
    vi.mocked(createUserClient).mockResolvedValue(
      makeMockSupabase({
        signInWithOAuth: vi.fn().mockResolvedValue({
          data: { url: null },
          error: { message: 'OAuth provider error' },
        }),
      })
    )
    const result = await signInWithGoogle(true)
    expect(result.error?.message).toBe('OAuth provider error')
  })
})
