'use client'

import { useActionState } from 'react'
import { createNewDeck } from '@/app/(app)/decks/actions'
import type { Result } from '@/types'

export function CreateDeckForm() {
  const [state, formAction, isPending] = useActionState<Result<void> | null, FormData>(
    createNewDeck,
    null
  )

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium">
          Title <span aria-hidden="true">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={100}
          placeholder="e.g. Spanish Vocabulary"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-required="true"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="subject" className="text-sm font-medium">
          Subject <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          maxLength={100}
          placeholder="e.g. Language Learning"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Creating…' : 'Create deck'}
      </button>
    </form>
  )
}
