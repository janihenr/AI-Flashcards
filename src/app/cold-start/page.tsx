import { Suspense } from 'react'
import { StudyQueue } from '@/components/study/StudyQueue'
import { getSystemDeck } from '@/server/db/queries/decks'
import { findCardsByDeckId } from '@/server/db/queries/cards'
import type { CardWithSchedule } from '@/stores/study-session'

async function AllCardsLoader({ deckId }: { deckId: string }) {
  const result = await findCardsByDeckId(deckId, { limit: 100 })
  const initialCards: CardWithSchedule[] = result.data?.items ?? []
  return <StudyQueue initialCards={initialCards} />
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
