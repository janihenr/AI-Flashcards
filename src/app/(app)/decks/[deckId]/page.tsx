import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { createUserClient } from '@/lib/supabase/user'
import { getDeckById } from '@/server/db/queries/decks'
import { findCardsByDeckId } from '@/server/db/queries/cards'

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  // Next.js 15: params is a Promise — must be awaited
  const { deckId } = await params

  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware handles the primary auth redirect; this is a belt-and-suspenders fallback
  if (!user) redirect('/login')

  const deckResult = await getDeckById(deckId)
  if (deckResult.error || !deckResult.data) notFound()

  const deck = deckResult.data

  // Ownership check: only the deck owner can view (shared access added in story 3-6)
  if (deck.userId !== user.id) notFound()

  // Fetch cards only after ownership is confirmed
  const cardsResult = await findCardsByDeckId(deckId, { limit: 50 })
  const cardItems = cardsResult.data?.items ?? []

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{deck.title}</h1>
          {deck.subject && (
            <p className="mt-1 text-sm text-muted-foreground">{deck.subject}</p>
          )}
        </div>
        <Link
          href={`/decks/${deckId}/cards/new`}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add card
        </Link>
      </div>

      {cardItems.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No cards yet.{' '}
          <Link href={`/decks/${deckId}/cards/new`} className="underline underline-offset-4">
            Add your first card
          </Link>{' '}
          to start studying.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {cardItems.map((card) => (
            <li
              key={card.id}
              className="rounded-lg border border-border p-4 flex items-start gap-4"
            >
              {card.imageUrl && (
                <div className="shrink-0">
                  <Image
                    src={card.imageUrl}
                    alt=""
                    width={64}
                    height={64}
                    className="rounded object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{card.frontContent}</p>
                <p className="mt-1 text-sm text-muted-foreground truncate">{card.backContent}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
