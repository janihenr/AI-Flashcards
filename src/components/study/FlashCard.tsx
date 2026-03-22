'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { CardMode } from '@/types'
import type { CardWithSchedule } from '@/stores/study-session'
import { RatingButtons } from './RatingButtons'

type Rating = 1 | 2 | 3 | 4

interface FlashCardProps {
  card: CardWithSchedule
  mode: CardMode
  onRate: (rating: Rating) => void
  sessionReady?: boolean
}

export function FlashCard({ card, mode, onRate, sessionReady = false }: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  // Reset flip state when the card changes (prevents showing back of previous card)
  useEffect(() => {
    setIsFlipped(false)
  }, [card.id])

  const getFrontContent = () => {
    switch (mode) {
      case 'image':
        // Never render <img src=""> — fires a request to the page URL; fall back to text
        if (!card.imageUrl) return <p className="text-xl font-medium text-gray-900">{card.frontContent}</p>
        // eslint-disable-next-line @next/next/no-img-element -- image mode requires raw <img> per story spec; URLs are user-provided placeholder values
        return <img src={card.imageUrl} alt={card.frontContent} className="w-full rounded" />
      case 'context-narrative':
        // Never render empty italic paragraph; fall back to front text
        if (!card.narrativeContext) return <p className="text-xl font-medium text-gray-900">{card.frontContent}</p>
        return <p className="text-gray-700 italic">{card.narrativeContext}</p>
      default:
        return <p className="text-xl font-medium text-gray-900">{card.frontContent}</p>
    }
  }

  const getBackContent = () => (
    <p className="text-xl text-gray-900">{card.backContent}</p>
  )

  return (
    <div className="relative w-full max-w-2xl mx-auto" style={{ perspective: '1000px' }}>
      <motion.div
        className="relative w-full min-h-64 cursor-pointer"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.4 }}
        onClick={() => !isFlipped && setIsFlipped(true)}
      >
        {/* Front */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-md"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {getFrontContent()}
          {!isFlipped && (
            <p className="absolute bottom-4 text-sm text-gray-400">Click to reveal</p>
          )}
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-md"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {getBackContent()}
        </div>
      </motion.div>
      {isFlipped && (
        <RatingButtons onRate={onRate} sessionReady={sessionReady} />
      )}
    </div>
  )
}
