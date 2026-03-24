/**
 * Unit tests for Story 2-1: Profile Server Actions
 *
 * Tests auth guards, validation guards, revalidatePath invocation, and
 * the updateProfile no-op + DB-error branches.
 *
 * All external dependencies are mocked — no Supabase or Next.js runtime needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock declarations ──────────────────────────────────────────────────────

vi.mock('@/lib/supabase/user', () => ({
  createUserClient: vi.fn(),
}))

vi.mock('@/server/db/queries/users', () => ({
  updateProfile: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

// Set env var so validateAvatarUrl works in tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://testproject.supabase.co'

// ─── Imports after mocks ─────────────────────────────────────────────────────

import { createUserClient } from '@/lib/supabase/user'
import { updateProfile } from '@/server/db/queries/users'
import { revalidatePath } from 'next/cache'
import { updateDisplayName, updateAvatarUrl } from '@/app/(app)/settings/profile/actions'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockAuthenticatedUser(userId = 'test-user-uuid') {
  vi.mocked(createUserClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as never)
}

function mockUnauthenticatedUser() {
  vi.mocked(createUserClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Not logged in' },
      }),
    },
  } as never)
}

// ─── updateDisplayName ────────────────────────────────────────────────────────

describe('updateDisplayName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(updateProfile).mockResolvedValue({ data: undefined, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockUnauthenticatedUser()
    const fd = new FormData()
    fd.set('displayName', 'Alice')

    const result = await updateDisplayName(fd)

    expect(result.error?.code).toBe('UNAUTHORIZED')
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('returns VALIDATION_ERROR for empty display name without calling updateProfile', async () => {
    mockAuthenticatedUser()
    const fd = new FormData()
    fd.set('displayName', '')

    const result = await updateDisplayName(fd)

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('returns VALIDATION_ERROR for display name over 50 characters without calling updateProfile', async () => {
    mockAuthenticatedUser()
    const fd = new FormData()
    fd.set('displayName', 'a'.repeat(51))

    const result = await updateDisplayName(fd)

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('trims whitespace and calls updateProfile with trimmed value', async () => {
    mockAuthenticatedUser('user-123')
    const fd = new FormData()
    fd.set('displayName', '  Alice  ')

    await updateDisplayName(fd)

    expect(updateProfile).toHaveBeenCalledWith('user-123', { displayName: 'Alice' })
  })

  it('returns success and calls revalidatePath on valid update', async () => {
    mockAuthenticatedUser()
    const fd = new FormData()
    fd.set('displayName', 'Alice')

    const result = await updateDisplayName(fd)

    expect(result.error).toBeNull()
    expect(result.data).toBeUndefined()
    expect(revalidatePath).toHaveBeenCalledWith('/settings/profile')
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('propagates DB_ERROR from updateProfile without calling revalidatePath', async () => {
    mockAuthenticatedUser()
    vi.mocked(updateProfile).mockResolvedValue({
      data: null,
      error: { message: 'Database error', code: 'DB_ERROR' },
    })
    const fd = new FormData()
    fd.set('displayName', 'Alice')

    const result = await updateDisplayName(fd)

    expect(result.error?.code).toBe('DB_ERROR')
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

// ─── updateAvatarUrl ──────────────────────────────────────────────────────────

describe('updateAvatarUrl', () => {
  // URL must include the authenticated userId ('test-user-uuid' from mockAuthenticatedUser)
  const validAvatarUrl =
    'https://testproject.supabase.co/storage/v1/object/public/avatars/test-user-uuid/avatar.png'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(updateProfile).mockResolvedValue({ data: undefined, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockUnauthenticatedUser()

    const result = await updateAvatarUrl(validAvatarUrl)

    expect(result.error?.code).toBe('UNAUTHORIZED')
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('returns VALIDATION_ERROR for a URL from a different domain', async () => {
    mockAuthenticatedUser()

    const result = await updateAvatarUrl('https://evil.com/avatar.png')

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('returns VALIDATION_ERROR for a URL outside the avatars bucket path', async () => {
    mockAuthenticatedUser()
    const wrongBucket =
      'https://testproject.supabase.co/storage/v1/object/public/deck-images/u/img.png'

    const result = await updateAvatarUrl(wrongBucket)

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('returns VALIDATION_ERROR when the URL path userId does not match authenticated user', async () => {
    mockAuthenticatedUser('test-user-uuid')
    const otherUserUrl =
      'https://testproject.supabase.co/storage/v1/object/public/avatars/different-user/avatar.png'

    const result = await updateAvatarUrl(otherUserUrl)

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('calls updateProfile with correct userId and avatarUrl on valid input', async () => {
    mockAuthenticatedUser('test-user-uuid')

    await updateAvatarUrl(validAvatarUrl)

    expect(updateProfile).toHaveBeenCalledWith('test-user-uuid', { avatarUrl: validAvatarUrl })
  })

  it('returns success and calls revalidatePath on valid update', async () => {
    mockAuthenticatedUser()

    const result = await updateAvatarUrl(validAvatarUrl)

    expect(result.error).toBeNull()
    expect(revalidatePath).toHaveBeenCalledWith('/settings/profile')
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})

