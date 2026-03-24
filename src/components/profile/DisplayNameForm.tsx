'use client'

import { useActionState } from 'react'
import { updateDisplayName } from '@/app/(app)/settings/profile/actions'
import { displayNameSchema } from '@/lib/validators/profile'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type State = { error: string | null; success: boolean; savedName: string | null }

function makeInitialState(displayName: string | null): State {
  return { error: null, success: false, savedName: displayName }
}

async function action(_prev: State, formData: FormData): Promise<State> {
  // Client-side validation before dispatching to server action
  const raw = formData.get('displayName')
  const parsed = displayNameSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid name', success: false, savedName: _prev.savedName }
  }

  const result = await updateDisplayName(formData)
  if (result.error) return { error: result.error.message, success: false, savedName: _prev.savedName }
  return { error: null, success: true, savedName: parsed.data }
}

type Props = { currentDisplayName: string | null }

export function DisplayNameForm({ currentDisplayName }: Props) {
  const [state, formAction, pending] = useActionState(action, makeInitialState(currentDisplayName))

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          key={state.savedName}
          defaultValue={state.savedName ?? ''}
          maxLength={50}
          placeholder="Your name"
          aria-describedby={state.error ? 'displayName-error' : undefined}
        />
        {state.error && (
          <p id="displayName-error" role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="text-sm text-green-600">
            Display name updated.
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? 'Saving…' : 'Save name'}
      </Button>
    </form>
  )
}
