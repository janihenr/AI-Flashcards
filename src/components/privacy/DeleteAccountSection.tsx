'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { deleteAccount } from '@/app/(app)/settings/privacy/actions'

export function DeleteAccountSection() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteAccount()
      if (result.error) {
        setError(result.error.message)
        return
      }
      // Session is now invalidated server-side; redirect away from (app) routes
      router.push('/')
    })
  }

  if (!showConfirm) {
    return (
      <Button
        variant="destructive"
        onClick={() => setShowConfirm(true)}
      >
        Delete account
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-destructive p-4">
      <p className="text-sm font-medium text-destructive">
        This will permanently delete your account. The following data will be removed:
      </p>
      <ul className="text-sm text-muted-foreground list-disc pl-4 flex flex-col gap-1">
        <li>Your profile and account information</li>
        <li>All decks, notes, and cards</li>
        <li>Your full study history (reviews)</li>
        <li>Your Learning Fingerprint preferences</li>
      </ul>
      <p className="text-sm text-muted-foreground">
        Payment data is managed by Stripe and is not affected. Full data erasure completes within 30 days.
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor="delete-confirm" className="text-sm font-medium">
          Type <span className="font-mono font-bold">DELETE</span> to confirm
        </label>
        <input
          id="delete-confirm"
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="border rounded px-3 py-2 text-sm w-full bg-background"
          placeholder="DELETE"
          autoComplete="off"
          aria-describedby={error ? 'delete-error' : undefined}
        />
      </div>
      {error && (
        <p id="delete-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          variant="destructive"
          disabled={confirmText !== 'DELETE' || isPending}
          onClick={handleDelete}
        >
          {isPending ? 'Deleting…' : 'Confirm deletion'}
        </Button>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => { setShowConfirm(false); setConfirmText(''); setError(null) }}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
