'use client'
import { Button } from '@/components/ui/button'

type Rating = 1 | 2 | 3 | 4

interface RatingButtonsProps {
  onRate: (rating: Rating) => void
  sessionReady: boolean
}

const RATINGS = [
  { rating: 1, label: 'Again', variant: 'destructive' },
  { rating: 2, label: 'Hard', variant: 'outline' },
  { rating: 3, label: 'Good', variant: 'default' },
  { rating: 4, label: 'Easy', variant: 'secondary' },
] as const

export function RatingButtons({ onRate, sessionReady }: RatingButtonsProps) {
  return (
    <div className="flex justify-center gap-3 mt-4" role="group" aria-label="Rate this card">
      {RATINGS.map(({ rating, label, variant }) => (
        <Button
          key={rating}
          variant={variant as 'destructive' | 'outline' | 'default' | 'secondary'}
          onClick={() => onRate(rating)}
          disabled={!sessionReady}
          aria-label={`Rate ${label}`}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}
