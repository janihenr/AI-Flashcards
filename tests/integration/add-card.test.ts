/**
 * Integration tests for Story 3-2: Add Cards to a Deck Manually
 *
 * Tests the addCardToDeck Server Action with all external dependencies mocked.
 * Covers auth guard, ownership check, validation, storage upload, transaction,
 * analytics tracking, and revalidation.
 *
 * Run with: pnpm test tests/integration/add-card.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock declarations (must be before imports) ────────────────────────────

vi.mock('@/lib/supabase/user', () => ({ createUserClient: vi.fn() }))
vi.mock('@/server/db/queries/decks', () => ({ createDeck: vi.fn(), getDeckById: vi.fn() }))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/server/db', () => ({
  db: {
    transaction: vi.fn(),
  },
}))

// ─── Imports after mocks ────────────────────────────────────────────────────

import { createUserClient } from '@/lib/supabase/user'
import { getDeckById } from '@/server/db/queries/decks'
import { trackEvent } from '@/lib/analytics'
import { revalidatePath } from 'next/cache'
import { db } from '@/server/db'
import { addCardToDeck } from '@/app/(app)/decks/actions'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-abc'
const DECK_ID = 'deck-111'
const CARD_ID = 'card-999'

function makeFormData(fields: Record<string, string | File>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

function makeCardFormData(overrides: Record<string, string | File> = {}): FormData {
  return makeFormData({
    deckId: DECK_ID,
    front: 'What is 2+2?',
    back: '4',
    ...overrides,
  })
}

function makeAuthClient(userId = USER_ID) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    storage: {
      from: vi.fn(),
    },
  }
}

function makeUnauthClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      }),
    },
  }
}

function makeOwnedDeck(userId = USER_ID) {
  return {
    data: {
      id: DECK_ID,
      userId,
      title: 'My Deck',
      subject: null,
      shareToken: null,
      deletedAt: null,
      createdAt: new Date(),
    },
    error: null,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('addCardToDeck', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: transaction resolves with card ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(db.transaction as any).mockImplementation(async (fn: (tx: any) => Promise<string>) => {
      const mockTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([{ id: 'note-111' }]).mockResolvedValueOnce([{ id: CARD_ID }]),
      }
      return fn(mockTx)
    })
    vi.mocked(getDeckById).mockResolvedValue(makeOwnedDeck())
  })

  // ── Auth guard ──────────────────────────────────────────────────────────────

  describe('auth guard', () => {
    it('returns UNAUTHORIZED when getUser() returns null user', async () => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeUnauthClient() as unknown as Awaited<ReturnType<typeof createUserClient>>
      )

      const result = await addCardToDeck(null, makeCardFormData())

      expect(result.error?.code).toBe('UNAUTHORIZED')
      expect(result.data).toBeNull()
      expect(vi.mocked(db.transaction)).not.toHaveBeenCalled()
    })
  })

  // ── Ownership check ──────────────────────────────────────────────────────────

  describe('ownership check', () => {
    beforeEach(() => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeAuthClient() as unknown as Awaited<ReturnType<typeof createUserClient>>
      )
    })

    it('returns NOT_FOUND when deck belongs to different user', async () => {
      vi.mocked(getDeckById).mockResolvedValue({
        data: {
          id: DECK_ID,
          userId: 'other-user',
          title: 'Other Deck',
          subject: null,
          shareToken: null,
          deletedAt: null,
          createdAt: new Date(),
        },
        error: null,
      })

      const result = await addCardToDeck(null, makeCardFormData())

      expect(result.error?.code).toBe('NOT_FOUND')
      expect(vi.mocked(db.transaction)).not.toHaveBeenCalled()
    })

    it('returns NOT_FOUND when deck does not exist', async () => {
      vi.mocked(getDeckById).mockResolvedValue({
        data: null,
        error: { message: 'Deck not found', code: 'NOT_FOUND' },
      })

      const result = await addCardToDeck(null, makeCardFormData())

      expect(result.error?.code).toBe('NOT_FOUND')
      expect(vi.mocked(db.transaction)).not.toHaveBeenCalled()
    })
  })

  // ── Validation ──────────────────────────────────────────────────────────────

  describe('validation', () => {
    beforeEach(() => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeAuthClient() as unknown as Awaited<ReturnType<typeof createUserClient>>
      )
    })

    it('returns VALIDATION_ERROR when front is empty string', async () => {
      const result = await addCardToDeck(null, makeCardFormData({ front: '' }))

      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toMatch(/front is required/i)
      expect(vi.mocked(db.transaction)).not.toHaveBeenCalled()
    })

    it('returns VALIDATION_ERROR when front is missing', async () => {
      const fd = makeFormData({ deckId: DECK_ID, back: '4' }) // no front
      const result = await addCardToDeck(null, fd)

      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(vi.mocked(db.transaction)).not.toHaveBeenCalled()
    })

    it('returns VALIDATION_ERROR when back is empty string', async () => {
      const result = await addCardToDeck(null, makeCardFormData({ back: '' }))

      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(result.error?.message).toMatch(/back is required/i)
      expect(vi.mocked(db.transaction)).not.toHaveBeenCalled()
    })

    it('returns VALIDATION_ERROR when front exceeds 2000 characters', async () => {
      const result = await addCardToDeck(null, makeCardFormData({ front: 'a'.repeat(2001) }))

      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(vi.mocked(db.transaction)).not.toHaveBeenCalled()
    })
  })

  // ── Success path (text-only card) ────────────────────────────────────────────

  describe('success path — text-only card', () => {
    beforeEach(() => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeAuthClient() as unknown as Awaited<ReturnType<typeof createUserClient>>
      )
    })

    it('calls db.transaction on valid input', async () => {
      await addCardToDeck(null, makeCardFormData())

      expect(vi.mocked(db.transaction)).toHaveBeenCalledOnce()
    })

    it('calls trackEvent with card_added, deckId, and cardId on success', async () => {
      await addCardToDeck(null, makeCardFormData())

      expect(vi.mocked(trackEvent)).toHaveBeenCalledWith('card_added', {
        deckId: DECK_ID,
        cardId: CARD_ID,
      })
    })

    it('calls revalidatePath for the deck detail page on success', async () => {
      await addCardToDeck(null, makeCardFormData())

      expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/decks/${DECK_ID}`)
    })

    it('returns { data: { id } } on success (no redirect)', async () => {
      const result = await addCardToDeck(null, makeCardFormData())

      expect(result.data?.id).toBe(CARD_ID)
      expect(result.error).toBeNull()
    })
  })

  // ── DB error path ───────────────────────────────────────────────────────────

  describe('DB error path', () => {
    beforeEach(() => {
      vi.mocked(createUserClient).mockResolvedValue(
        makeAuthClient() as unknown as Awaited<ReturnType<typeof createUserClient>>
      )
    })

    it('returns DB_ERROR when transaction throws', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(db.transaction as any).mockRejectedValue(new Error('connection lost'))

      const result = await addCardToDeck(null, makeCardFormData())

      expect(result.error?.code).toBe('DB_ERROR')
      expect(result.data).toBeNull()
    })

    it('does NOT call trackEvent when transaction fails', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(db.transaction as any).mockRejectedValue(new Error('timeout'))

      await addCardToDeck(null, makeCardFormData())

      expect(vi.mocked(trackEvent)).not.toHaveBeenCalled()
    })

    it('does NOT call revalidatePath when transaction fails', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(db.transaction as any).mockRejectedValue(new Error('timeout'))

      await addCardToDeck(null, makeCardFormData())

      expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled()
    })
  })

  // ── Image upload path ────────────────────────────────────────────────────────

  describe('image upload path', () => {
    it('returns STORAGE_ERROR when storage upload fails', async () => {
      const mockClient = makeAuthClient()
      mockClient.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: new Error('upload failed') }),
        getPublicUrl: vi.fn(),
      })
      vi.mocked(createUserClient).mockResolvedValue(
        mockClient as unknown as Awaited<ReturnType<typeof createUserClient>>
      )

      const imageFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
      const result = await addCardToDeck(null, makeCardFormData({ image: imageFile }))

      expect(result.error?.code).toBe('STORAGE_ERROR')
      expect(vi.mocked(db.transaction)).not.toHaveBeenCalled()
    })

    it('returns VALIDATION_ERROR for oversized image (server-side check)', async () => {
      const mockClient = makeAuthClient()
      vi.mocked(createUserClient).mockResolvedValue(
        mockClient as unknown as Awaited<ReturnType<typeof createUserClient>>
      )

      // Create a file that reports size > 5MB via a mock
      const bigFile = Object.defineProperty(
        new File(['x'], 'big.jpg', { type: 'image/jpeg' }),
        'size',
        { value: 6 * 1024 * 1024, configurable: true }
      )
      const result = await addCardToDeck(null, makeCardFormData({ image: bigFile }))

      expect(result.error?.code).toBe('VALIDATION_ERROR')
      expect(vi.mocked(db.transaction)).not.toHaveBeenCalled()
    })
  })
})
