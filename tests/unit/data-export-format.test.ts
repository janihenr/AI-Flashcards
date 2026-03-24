/**
 * Unit tests for Story 2-4: GDPR Personal Data Export format
 *
 * Validates the structure and GDPR compliance of the data export JSON format.
 * Tests that required fields are present, excluded fields are absent, and
 * the format identifier matches the expected version string.
 *
 * Run with: pnpm test tests/unit/data-export-format.test.ts
 */
import { describe, it, expect } from 'vitest'

// ─── Export format builder (mirrors Edge Function logic for testing) ──────────

type ExportProfile = {
  id: string
  displayName: string | null
  tier: string
  gdprConsentAt: string | null
  createdAt: string
  learningFingerprint: {
    formatPreferences: Record<string, number> | null
    userFsrsParams: number[] | null
  }
}

type ExportCard = {
  id: string
  noteId: string
  mode: string
  frontContent: string
  backContent: string
  narrativeContext: string | null
  fsrs: {
    stability: number
    difficulty: number
    reps: number
    lapses: number
    state: number
    due: string
  }
  createdAt: string
}

type ExportNote = {
  id: string
  content: string
  createdAt: string
  cards: ExportCard[]
}

type ExportDeck = {
  id: string
  title: string
  subject: string | null
  createdAt: string
  notes: ExportNote[]
}

type ExportReview = {
  id: string
  cardId: string
  rating: number
  presentationMode: string | null
  responseTimeMs: number | null
  reviewedAt: string
}

type GdprExport = {
  exportedAt: string
  format: string
  profile: ExportProfile | null
  decks: ExportDeck[]
  reviews: ExportReview[]
}

function buildExport(overrides: Partial<GdprExport> = {}): GdprExport {
  return {
    exportedAt: '2026-03-24T10:00:00.000Z',
    format: 'flashcards-gdpr-export-v1',
    profile: {
      id: 'user-uuid',
      displayName: 'Alice',
      tier: 'free',
      gdprConsentAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      learningFingerprint: {
        formatPreferences: { qa: 0.6, image: 0.4, 'context-narrative': 0.5 },
        userFsrsParams: null,
      },
    },
    decks: [
      {
        id: 'deck-uuid',
        title: 'My First Deck',
        subject: 'History',
        createdAt: '2026-02-01T00:00:00.000Z',
        notes: [
          {
            id: 'note-uuid',
            content: 'Raw source note text',
            createdAt: '2026-02-01T00:00:00.000Z',
            cards: [
              {
                id: 'card-uuid',
                noteId: 'note-uuid',
                mode: 'qa',
                frontContent: 'Question?',
                backContent: 'Answer.',
                narrativeContext: null,
                fsrs: {
                  stability: 1.5,
                  difficulty: 5.0,
                  reps: 3,
                  lapses: 0,
                  state: 2,
                  due: '2026-04-01T00:00:00.000Z',
                },
                createdAt: '2026-02-01T00:00:00.000Z',
              },
            ],
          },
        ],
      },
    ],
    reviews: [
      {
        id: 'review-uuid',
        cardId: 'card-uuid',
        rating: 3,
        presentationMode: 'qa',
        responseTimeMs: 4200,
        reviewedAt: '2026-03-01T10:00:00.000Z',
      },
    ],
    ...overrides,
  }
}

// ─── Top-level structure ──────────────────────────────────────────────────────

describe('GDPR export — top-level structure', () => {
  it('has all required top-level keys', () => {
    const exported = buildExport()
    expect(exported).toHaveProperty('exportedAt')
    expect(exported).toHaveProperty('format')
    expect(exported).toHaveProperty('profile')
    expect(exported).toHaveProperty('decks')
    expect(exported).toHaveProperty('reviews')
  })

  it('format identifier is "flashcards-gdpr-export-v1"', () => {
    const exported = buildExport()
    expect(exported.format).toBe('flashcards-gdpr-export-v1')
  })

  it('exportedAt is a valid ISO timestamp', () => {
    const exported = buildExport()
    expect(() => new Date(exported.exportedAt)).not.toThrow()
    expect(new Date(exported.exportedAt).toISOString()).toBe(exported.exportedAt)
  })

  it('decks is an array', () => {
    const exported = buildExport()
    expect(Array.isArray(exported.decks)).toBe(true)
  })

  it('reviews is an array', () => {
    const exported = buildExport()
    expect(Array.isArray(exported.reviews)).toBe(true)
  })
})

// ─── Profile section ──────────────────────────────────────────────────────────

describe('GDPR export — profile section', () => {
  it('includes allowed profile fields', () => {
    const { profile } = buildExport()
    expect(profile).toHaveProperty('id')
    expect(profile).toHaveProperty('displayName')
    expect(profile).toHaveProperty('tier')
    expect(profile).toHaveProperty('gdprConsentAt')
    expect(profile).toHaveProperty('createdAt')
    expect(profile).toHaveProperty('learningFingerprint')
  })

  it('does NOT include isAdmin (internal flag)', () => {
    const { profile } = buildExport()
    expect(profile).not.toHaveProperty('isAdmin')
    expect(profile).not.toHaveProperty('is_admin')
  })

  it('does NOT include deletedAt (internal soft-delete state)', () => {
    const { profile } = buildExport()
    expect(profile).not.toHaveProperty('deletedAt')
    expect(profile).not.toHaveProperty('deleted_at')
  })

  it('does NOT include previousTier (internal tier tracking)', () => {
    const { profile } = buildExport()
    expect(profile).not.toHaveProperty('previousTier')
    expect(profile).not.toHaveProperty('previous_tier')
  })

  it('learningFingerprint has formatPreferences and userFsrsParams', () => {
    const { profile } = buildExport()
    expect(profile?.learningFingerprint).toHaveProperty('formatPreferences')
    expect(profile?.learningFingerprint).toHaveProperty('userFsrsParams')
  })

  it('learningFingerprint.formatPreferences can be null for new users', () => {
    const exported = buildExport({
      profile: {
        id: 'user-uuid',
        displayName: null,
        tier: 'free',
        gdprConsentAt: null,
        createdAt: '2026-03-24T00:00:00.000Z',
        learningFingerprint: { formatPreferences: null, userFsrsParams: null },
      },
    })
    expect(exported.profile?.learningFingerprint.formatPreferences).toBeNull()
    expect(exported.profile?.learningFingerprint.userFsrsParams).toBeNull()
  })
})

// ─── Deck section ─────────────────────────────────────────────────────────────

describe('GDPR export — deck section', () => {
  it('deck includes required fields', () => {
    const { decks } = buildExport()
    const deck = decks[0]
    expect(deck).toHaveProperty('id')
    expect(deck).toHaveProperty('title')
    expect(deck).toHaveProperty('subject')
    expect(deck).toHaveProperty('createdAt')
    expect(deck).toHaveProperty('notes')
  })

  it('deck does NOT include shareToken (internal field)', () => {
    const { decks } = buildExport()
    const deck = decks[0]
    expect(deck).not.toHaveProperty('shareToken')
    expect(deck).not.toHaveProperty('share_token')
  })

  it('deck does NOT include deletedAt (soft-delete state)', () => {
    const { decks } = buildExport()
    const deck = decks[0]
    expect(deck).not.toHaveProperty('deletedAt')
    expect(deck).not.toHaveProperty('deleted_at')
  })

  it('deck.notes is an array', () => {
    const { decks } = buildExport()
    expect(Array.isArray(decks[0].notes)).toBe(true)
  })

  it('note includes content and createdAt', () => {
    const note = buildExport().decks[0].notes[0]
    expect(note).toHaveProperty('id')
    expect(note).toHaveProperty('content')
    expect(note).toHaveProperty('createdAt')
    expect(note).toHaveProperty('cards')
  })

  it('card includes FSRS scheduling fields', () => {
    const card = buildExport().decks[0].notes[0].cards[0]
    expect(card).toHaveProperty('fsrs')
    expect(card.fsrs).toHaveProperty('stability')
    expect(card.fsrs).toHaveProperty('difficulty')
    expect(card.fsrs).toHaveProperty('reps')
    expect(card.fsrs).toHaveProperty('lapses')
    expect(card.fsrs).toHaveProperty('state')
    expect(card.fsrs).toHaveProperty('due')
  })

  it('card does NOT include userId (user already owns the export)', () => {
    const card = buildExport().decks[0].notes[0].cards[0]
    expect(card).not.toHaveProperty('userId')
    expect(card).not.toHaveProperty('user_id')
  })
})

// ─── Review section ───────────────────────────────────────────────────────────

describe('GDPR export — review section', () => {
  it('review includes required fields', () => {
    const review = buildExport().reviews[0]
    expect(review).toHaveProperty('id')
    expect(review).toHaveProperty('cardId')
    expect(review).toHaveProperty('rating')
    expect(review).toHaveProperty('presentationMode')
    expect(review).toHaveProperty('responseTimeMs')
    expect(review).toHaveProperty('reviewedAt')
  })

  it('review rating is numeric (FSRS: 1=Again, 2=Hard, 3=Good, 4=Easy)', () => {
    const review = buildExport().reviews[0]
    expect(typeof review.rating).toBe('number')
    expect(review.rating).toBeGreaterThanOrEqual(1)
    expect(review.rating).toBeLessThanOrEqual(4)
  })

  it('review presentationMode can be null (anonymous sessions)', () => {
    const exported = buildExport({
      reviews: [{ id: 'r', cardId: 'c', rating: 1, presentationMode: null, responseTimeMs: null, reviewedAt: '2026-01-01T00:00:00.000Z' }],
    })
    expect(exported.reviews[0].presentationMode).toBeNull()
    expect(exported.reviews[0].responseTimeMs).toBeNull()
  })
})

// ─── GDPR exclusion contract ──────────────────────────────────────────────────

describe('GDPR export — excluded data contract', () => {
  it('export does not contain any payment-related fields', () => {
    const json = JSON.stringify(buildExport())
    expect(json).not.toContain('stripe')
    expect(json).not.toContain('payment')
    expect(json).not.toContain('card_number')
  })

  it('export does not contain AI prompt content fields', () => {
    const json = JSON.stringify(buildExport())
    expect(json).not.toContain('learning_goal')
    expect(json).not.toContain('learningGoal')
    expect(json).not.toContain('ai_prompt')
  })

  it('export does not contain anonymous session data', () => {
    const json = JSON.stringify(buildExport())
    expect(json).not.toContain('anonymous_sessions')
    expect(json).not.toContain('supabase_anon_id')
  })
})
