import { describe, it, expect, beforeEach } from 'vitest'
import { useStudySessionStore, type CardWithSchedule } from '../study-session'

function makeCard(overrides: Partial<CardWithSchedule> = {}): CardWithSchedule {
  return {
    id: 'card-1',
    noteId: 'note-1',
    userId: 'user-1',
    mode: 'qa',
    frontContent: 'What is spaced repetition?',
    backContent: 'Reviewing at increasing intervals.',
    narrativeContext: null,
    imageUrl: null,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    due: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => {
  useStudySessionStore.setState({
    cards: [],
    currentIndex: 0,
    ratings: [],
    cardDisplayedAt: null,
    sessionReady: false,
  })
})

describe('useStudySessionStore', () => {
  describe('setCards()', () => {
    it('sets cards, resets index to 0, and records cardDisplayedAt', () => {
      const cards = [makeCard(), makeCard({ id: 'card-2' })]
      const before = Date.now()
      useStudySessionStore.getState().setCards(cards)
      const state = useStudySessionStore.getState()

      expect(state.cards).toHaveLength(2)
      expect(state.currentIndex).toBe(0)
      expect(state.cardDisplayedAt).not.toBeNull()
      expect(state.cardDisplayedAt!).toBeGreaterThanOrEqual(before)
    })
  })

  describe('rateCard()', () => {
    it('appends a review with cardId, rating, responseTimeMs, and presentationMode', () => {
      useStudySessionStore.setState({ cardDisplayedAt: Date.now() - 500 })
      useStudySessionStore.getState().rateCard('card-1', 3, 'qa')
      const { ratings } = useStudySessionStore.getState()

      expect(ratings).toHaveLength(1)
      expect(ratings[0].cardId).toBe('card-1')
      expect(ratings[0].rating).toBe(3)
      expect(ratings[0].presentationMode).toBe('qa')
      expect(ratings[0].responseTimeMs).toBeGreaterThanOrEqual(400)
    })

    it('accumulates multiple ratings', () => {
      useStudySessionStore.setState({ cardDisplayedAt: Date.now() })
      useStudySessionStore.getState().rateCard('card-1', 1, 'qa')
      useStudySessionStore.getState().rateCard('card-2', 4, 'image')
      expect(useStudySessionStore.getState().ratings).toHaveLength(2)
    })
  })

  describe('nextCard()', () => {
    it('increments currentIndex and updates cardDisplayedAt', () => {
      useStudySessionStore.setState({ currentIndex: 0, cardDisplayedAt: 0 })
      const before = Date.now()
      useStudySessionStore.getState().nextCard()
      const state = useStudySessionStore.getState()

      expect(state.currentIndex).toBe(1)
      expect(state.cardDisplayedAt!).toBeGreaterThanOrEqual(before)
    })
  })

  describe('reset()', () => {
    it('resets all state to initial values', () => {
      useStudySessionStore.setState({
        cards: [makeCard()],
        currentIndex: 2,
        ratings: [{ cardId: 'x', rating: 3, responseTimeMs: 100, presentationMode: 'qa' }],
        cardDisplayedAt: 999,
      })
      useStudySessionStore.getState().reset()
      const state = useStudySessionStore.getState()

      expect(state.cards).toHaveLength(0)
      expect(state.currentIndex).toBe(0)
      expect(state.ratings).toHaveLength(0)
      expect(state.cardDisplayedAt).toBeNull()
    })
  })

  describe('setSessionReady()', () => {
    it('sets sessionReady to true', () => {
      expect(useStudySessionStore.getState().sessionReady).toBe(false)
      useStudySessionStore.getState().setSessionReady(true)
      expect(useStudySessionStore.getState().sessionReady).toBe(true)
    })
  })
})
