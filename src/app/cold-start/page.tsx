import { Suspense } from 'react'
import { StudyQueue } from '@/components/study/StudyQueue'
import { getSystemDeck } from '@/server/db/queries/decks'
import { findCardsByDeckId } from '@/server/db/queries/cards'
import type { CardWithSchedule } from '@/stores/study-session'

// Cold-start deck is a curated system deck — kept under 100 cards by design.
// If the deck ever exceeds this, add pagination here rather than silently truncating.
const COLD_START_CARD_LIMIT = 100

async function AllCardsLoader({ deckId }: { deckId: string }) {
  const result = await findCardsByDeckId(deckId, { limit: COLD_START_CARD_LIMIT })
  if (result.error) {
    return (
      <div className="w-full max-w-2xl text-center py-12">
        <p className="text-gray-500 mb-4">Unable to load the study deck. Please try again.</p>
        <a href="/cold-start" className="text-blue-600 underline text-sm">Refresh</a>
      </div>
    )
  }
  return <StudyQueue initialCards={result.data.items} />
}

export default async function ColdStartPage() {
  const deckResult = await getSystemDeck()
  if (deckResult.error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <p className="text-gray-500">Deck not available. Please check back later.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-2xl">
            <div className="animate-pulse min-h-64 bg-gray-100 rounded-xl" />
          </div>
        }
      >
        <AllCardsLoader deckId={deckResult.data.id} />
      </Suspense>
    </main>
  )
}
