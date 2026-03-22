'use client'
import { useStudySessionStore, type CardWithSchedule } from '@/stores/study-session'

export interface UseStudySessionReturn {
  currentCard: CardWithSchedule | null
  hasNext: boolean
  isComplete: boolean
  sessionReady: boolean
  rateCard: (rating: 1 | 2 | 3 | 4) => void
}

export function useStudySession(): UseStudySessionReturn {
  const { cards, currentIndex, sessionReady, rateCard: storeRateCard, nextCard } = useStudySessionStore()

  const currentCard = currentIndex < cards.length ? cards[currentIndex] : null
  const hasNext = currentIndex + 1 < cards.length
  const isComplete = cards.length > 0 && currentIndex >= cards.length

  const rateCard = (rating: 1 | 2 | 3 | 4) => {
    if (!currentCard) return
    storeRateCard(currentCard.id, rating, currentCard.mode)
    nextCard()
  }

  return { currentCard, hasNext, isComplete, sessionReady, rateCard }
}
