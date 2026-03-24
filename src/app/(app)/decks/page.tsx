import Link from 'next/link'

export default function DecksPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Decks</h1>
        <Link
          href="/decks/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create deck
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Your flashcard decks will appear here.</p>
    </main>
  )
}
