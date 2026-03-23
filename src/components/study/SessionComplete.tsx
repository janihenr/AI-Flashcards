'use client'
import Link from 'next/link'
import type { CardReview } from '@/stores/study-session'

interface SessionCompleteProps {
  ratings: CardReview[]
}

const RATING_LABELS: Record<number, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
}

export function SessionComplete({ ratings }: SessionCompleteProps) {
  const total = ratings.length
  const goodOrBetter = ratings.filter((r) => r.rating >= 3).length
  const pct = total > 0 ? Math.round((goodOrBetter / total) * 100) : 0

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Complete!</h1>
        <p className="text-gray-500 mb-6">You reviewed all cards in the deck.</p>

        {total > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-medium text-gray-700 mb-2">Your results:</p>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Cards reviewed</span>
              <span className="font-semibold">{total}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Good or Easy</span>
              <span className="font-semibold">{goodOrBetter} ({pct}%)</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1 justify-center">
              {ratings.map((r, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    r.rating === 4
                      ? 'bg-blue-100 text-blue-700'
                      : r.rating === 3
                        ? 'bg-green-100 text-green-700'
                        : r.rating === 2
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                  }`}
                >
                  {RATING_LABELS[r.rating]}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-gray-600 mb-6">
          Sign up to save your progress, track your learning, and access more decks.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/signup?upgrade=true"
            className="w-full inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Sign up to save progress
          </Link>
          <Link
            href="/signup"
            className="w-full inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Explore more decks
          </Link>
        </div>
      </div>
    </main>
  )
}
