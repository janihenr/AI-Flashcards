/**
 * Integration tests for Story 3-1: Create a New Flashcard Deck
 *
 * Tests the createNewDeck Server Action with all external dependencies mocked.
 * Covers auth guard, validation, DAL call, analytics tracking, and redirect.
 *
 * Run with: pnpm test tests/integration/create-deck.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock declarations ────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/user', () => ({ createUserClient: vi.fn() }))
vi.mock('@/server/db/queries/decks', () => ({ createDeck: vi.fn() }))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { createUserClient } from '@/lib/supabase/user'
import { createDeck } from '@/server/db/queries/decks'
import { trackEvent } from '@/lib/analytics'
import { redirect } from 'next/navigation'
import { createNewDeck } from '@/app/(app)/decks/actions'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

function makeAuthenticatedClient(userId = 'user-abc') {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId, email: 'user@example.com' } },
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

describe('createNewDeck', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createDeck).mockResolvedValue({ data: { id: 'deck-id-123' }, error: null })
  })

  // ── Auth guard ──────────────────────────────────────────────────────────────

  describe('auth guard', () => {
    it('returns UNAUTHORIZED when getUser() returns null user', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeUnauthenticatedClient() as unknown as Awaited<ReturnType<typeof createUserClient>>
      )

      const result = await createNewDeck(null, makeFormData({ title: 'My Deck' }))

      expect(result.error?.code).toBe('UNAUTHORIZED')
      expect(result.data).toBeNull()
      expect(vi.mocked(createDeck)).not.toHaveBeenCalled()
    })

    it('returns UNAUTHORIZED when getUser() returns an auth error', async () => {
      vi.mocked(createUserClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('auth failure'),
          }),
        },
      } as unknown as Awaited<ReturnType<typeof createUserClient>>)

      const result = await createNewDeck(null, makeFormData({ title: 'My Deck' }))

      expect(result.error?.code).toBe('UNAUTHORIZED')
      expect(vi.mocked(createDeck)).not.toHaveBeenCalled()
    })
  })

  // ── Validation ──────────────────────────────────────────────────────────────

  describe('validation', () => {
    beforeEach(() => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeAuthenticatedClient() as unknown as Awaited<ReturnType<typeof createUserClient>>
      )
    })

    it('returns VALIDATION_ERROR when title is empty string', async () => {
      const result = await createNewDeck(null, makeFormData({ title: '' }))

      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toMatch(/title is required/i)
      expect(vi.mocked(createDeck)).not.toHaveBeenCalled()
    })

    it('returns VALIDATION_ERROR when title field is missing (null from FormData)', async () => {
      const fd = new FormData() // no title field at all
      const result = await createNewDeck(null, fd)

      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(vi.mocked(createDeck)).not.toHaveBeenCalled()
    })

    it('returns VALIDATION_ERROR when title exceeds 100 characters', async () => {
      const result = await createNewDeck(null, makeFormData({ title: 'a'.repeat(101) }))

      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toMatch(/100 characters/i)
      expect(vi.mocked(createDeck)).not.toHaveBeenCalled()
    })

    it('createDeck is NOT called when validation fails', async () => {
      await createNewDeck(null, makeFormData({ title: '' }))
      expect(vi.mocked(createDeck)).not.toHaveBeenCalled()
    })
  })

  // ── Success path ────────────────────────────────────────────────────────────

  describe('success path', () => {
    beforeEach(() => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeAuthenticatedClient('user-abc') as unknown as Awaited<ReturnType<typeof createUserClient>>
      )
    })

    it('calls createDeck with correct userId, title, and subject', async () => {
      await createNewDeck(null, makeFormData({ title: 'Spanish Vocab', subject: 'Languages' }))

      expect(vi.mocked(createDeck)).toHaveBeenCalledWith('user-abc', {
        title: 'Spanish Vocab',
        subject: 'Languages',
      })
    })

    it('calls createDeck with undefined subject when subject field is empty', async () => {
      await createNewDeck(null, makeFormData({ title: 'Math', subject: '' }))

      expect(vi.mocked(createDeck)).toHaveBeenCalledWith('user-abc', {
        title: 'Math',
        subject: undefined,
      })
    })

    it('calls createDeck with undefined subject when subject field is absent', async () => {
      await createNewDeck(null, makeFormData({ title: 'History' }))

      expect(vi.mocked(createDeck)).toHaveBeenCalledWith('user-abc', {
        title: 'History',
        subject: undefined,
      })
    })

    it('calls trackEvent with deck_created and deckId on success', async () => {
      vi.mocked(createDeck).mockResolvedValue({ data: { id: 'deck-id-123' }, error: null })

      await createNewDeck(null, makeFormData({ title: 'My Deck' }))

      expect(vi.mocked(trackEvent)).toHaveBeenCalledWith('deck_created', { deckId: 'deck-id-123' })
    })

    it('calls redirect to /decks/{deckId} on success', async () => {
      vi.mocked(createDeck).mockResolvedValue({ data: { id: 'deck-id-123' }, error: null })

      await createNewDeck(null, makeFormData({ title: 'My Deck' }))

      expect(vi.mocked(redirect)).toHaveBeenCalledWith('/decks/deck-id-123')
    })
  })

  // ── DB error path ───────────────────────────────────────────────────────────

  describe('DB error path', () => {
    beforeEach(() => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeAuthenticatedClient() as unknown as Awaited<ReturnType<typeof createUserClient>>
      )
    })

    it('returns DB_ERROR from createDeck as-is', async () => {
      vi.mocked(createDeck).mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'DB_ERROR' },
      })

      const result = await createNewDeck(null, makeFormData({ title: 'My Deck' }))

      expect(result.error?.code).toBe('DB_ERROR')
      expect(result.data).toBeNull()
    })

    it('does NOT call trackEvent when createDeck returns an error', async () => {
      vi.mocked(createDeck).mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'DB_ERROR' },
      })

      await createNewDeck(null, makeFormData({ title: 'My Deck' }))

      expect(vi.mocked(trackEvent)).not.toHaveBeenCalled()
    })

    it('does NOT call redirect when createDeck returns an error', async () => {
      vi.mocked(createDeck).mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'DB_ERROR' },
      })

      await createNewDeck(null, makeFormData({ title: 'My Deck' }))

      expect(vi.mocked(redirect)).not.toHaveBeenCalled()
    })
  })
})
