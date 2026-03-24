import { redirect } from 'next/navigation'
import { createUserClient } from '@/lib/supabase/user'
import { CreateDeckForm } from '@/components/decks/CreateDeckForm'

export const metadata = { title: 'Create Deck' }

export default async function NewDeckPage() {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware handles the primary auth redirect; this is a belt-and-suspenders fallback
  if (!user) redirect('/login')

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold">Create a new deck</h1>
      <CreateDeckForm />
    </main>
  )
}
