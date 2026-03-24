'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addCardToDeck } from '@/app/(app)/decks/actions'
import { MAX_IMAGE_BYTES, ACCEPTED_IMAGE_TYPES } from '@/lib/validators/card'
import type { Result } from '@/types'

interface AddCardFormProps {
  deckId: string
  deckTitle: string
}

export function AddCardForm({ deckId, deckTitle }: AddCardFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<Result<{ id: string }> | null, FormData>(
    addCardToDeck,
    null
  )
  const formRef = useRef<HTMLFormElement>(null)
  const frontInputRef = useRef<HTMLTextAreaElement>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const lastSuccessId = useRef<string | null>(null)

  // After successful card creation: reset form + auto-focus front (rapid-entry UX)
  useEffect(() => {
    if (state?.data?.id && state.data.id !== lastSuccessId.current) {
      lastSuccessId.current = state.data.id
      formRef.current?.reset()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImageError(null)
      // Defer focus until after DOM update
      setTimeout(() => frontInputRef.current?.focus(), 0)
    }
  }, [state?.data?.id])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      setImageError(null)
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image must be 5 MB or smaller')
      e.target.value = ''
    } else if (!ACCEPTED_IMAGE_TYPES.includes(file.type as typeof ACCEPTED_IMAGE_TYPES[number])) {
      setImageError('Accepted formats: JPEG, PNG, GIF, WEBP')
      e.target.value = ''
    } else {
      setImageError(null)
    }
  }

  const inputClass =
    'rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full'

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="deckId" value={deckId} />

      <div className="flex flex-col gap-2">
        <label htmlFor="front" className="text-sm font-medium">
          Front <span aria-hidden="true">*</span>
        </label>
        <textarea
          ref={frontInputRef}
          id="front"
          name="front"
          required
          maxLength={2000}
          rows={3}
          placeholder="Question or term"
          className={inputClass}
          aria-required="true"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="back" className="text-sm font-medium">
          Back <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="back"
          name="back"
          required
          maxLength={2000}
          rows={3}
          placeholder="Answer or definition"
          className={inputClass}
          aria-required="true"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="image" className="text-sm font-medium">
          Image{' '}
          <span className="text-muted-foreground font-normal">(optional, ≤ 5 MB)</span>
        </label>
        <input
          id="image"
          name="image"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          onChange={handleImageChange}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
        />
        {imageError && (
          <p role="alert" className="text-sm text-destructive">
            {imageError}
          </p>
        )}
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error.message}
        </p>
      )}

      {state?.data && (
        <p className="text-sm text-green-600" aria-live="polite">
          Card added to {deckTitle}!
        </p>
      )}

      {/* Sticky action bar — stays above mobile keyboard at all times */}
      <div className="sticky bottom-0 bg-background pb-4 pt-2 flex gap-3 border-t border-border">
        <button
          type="submit"
          disabled={isPending || !!imageError}
          className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Add & next'}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => router.push(`/decks/${deckId}`)}
          className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          Done
        </button>
      </div>
    </form>
  )
}
