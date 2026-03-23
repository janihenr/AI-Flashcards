'use client'
import { useEffect, useRef } from 'react'
import { useStudySessionStore } from '@/stores/study-session'
import { useStudySession } from '@/hooks/useStudySession'
import { FlashCard } from './FlashCard'
import { SessionComplete } from './SessionComplete'
import { rateAnonymousCard } from '@/app/cold-start/actions'
import type { CardWithSchedule } from '@/stores/study-session'
import type { Result } from '@/types'

interface StudyQueueProps {
  /** All cards for the deck — fetched server-side and passed as props */
  initialCards: CardWithSchedule[]
}

export function StudyQueue({ initialCards }: StudyQueueProps) {
  const setCards = useStudySessionStore((s) => s.setCards)
  const ratings = useStudySessionStore((s) => s.ratings)
  const { currentCard, isComplete, sessionReady, rateCard } = useStudySession()
  const isRatingRef = useRef(false)

  // Hydrate the store once on mount using a stable ref to avoid re-runs on parent re-renders
  const initialCardsRef = useRef(initialCards)
  useEffect(() => {
    if (initialCardsRef.current.length === 0) return
    setCards(initialCardsRef.current)
  }, [setCards])

  // Empty deck guard
  if (initialCards.length === 0) {
    return <SessionComplete ratings={[]} />
  }

  // Completion guard — bounds check: currentIndex >= cards.length
  if (isComplete) {
    return <SessionComplete ratings={ratings} />
  }

  // Guard until store is hydrated
  if (!currentCard) {
    return (
      <div className="w-full max-w-2xl animate-pulse">
        <div className="bg-gray-100 rounded-xl min-h-64 w-full" />
      </div>
    )
  }

  const handleRate = async (rating: 1 | 2 | 3 | 4) => {
    if (isRatingRef.current) return
    isRatingRef.current = true
    const timeout = new Promise<Result<null>>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'Rating save timed out', code: 'TIMEOUT' } }), 5000)
    )
    const result = await Promise.race([rateAnonymousCard(currentCard.id, rating), timeout])
    if (result.error) {
      // Non-blocking: log but do not prevent card progression
      console.warn('[StudyQueue] Rating not saved:', result.error.message)
    }
    rateCard(rating)
    isRatingRef.current = false
  }

  return (
    <div className="w-full max-w-2xl">
      <FlashCard
        card={currentCard}
        mode={currentCard.mode}
        onRate={handleRate}
        sessionReady={sessionReady}
      />
    </div>
  )
}
