import { notFound } from 'next/navigation'
import { createUserClient } from '@/lib/supabase/user'
import { getDeckById } from '@/server/db/queries/decks'
import { AddCardForm } from '@/components/decks/AddCardForm'

export const metadata = { title: 'Add Card' }

export default async function AddCardPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  // Next.js 15: params is a Promise — must be awaited
  const { deckId } = await params

  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  // (app) layout guarantees user is authenticated — null path is unreachable
  if (!user) return null

  const result = await getDeckById(deckId)
  if (result.error || !result.data) notFound()

  const deck = result.data

  // Ownership check: only the deck owner can add cards (shared access is read-only per story 3-6)
  if (deck.userId !== user.id) notFound()

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Add card</h1>
        <p className="mt-1 text-sm text-muted-foreground">{deck.title}</p>
      </div>
      <AddCardForm deckId={deckId} deckTitle={deck.title} />
    </main>
  )
}
