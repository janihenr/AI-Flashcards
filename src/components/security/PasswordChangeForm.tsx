'use client'

import { useActionState } from 'react'
import { changePassword } from '@/app/(app)/settings/security/actions'
import { newPasswordSchema } from '@/lib/validators/password'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type State = {
  error: string | null
  fieldError: { currentPassword?: string; newPassword?: string; confirmPassword?: string } | null
  success: boolean
}

const initialState: State = { error: null, fieldError: null, success: false }

async function action(_prev: State, formData: FormData): Promise<State> {
  const currentPassword = formData.get('currentPassword')
  const newPassword = formData.get('newPassword')
  const confirmPassword = formData.get('confirmPassword')

  // Client-side validation before dispatching to server action
  if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.length === 0) {
    return { error: null, fieldError: { currentPassword: 'Current password is required' }, success: false }
  }

  const parsed = newPasswordSchema.safeParse(newPassword)
  if (!parsed.success) {
    return {
      error: null,
      fieldError: { newPassword: parsed.error.issues[0]?.message ?? 'Invalid password' },
      success: false,
    }
  }

  if (confirmPassword !== newPassword) {
    return { error: null, fieldError: { confirmPassword: 'Passwords do not match' }, success: false }
  }

  const result = await changePassword(formData)
  if (result.error) {
    // Surface current password error as a field error for better UX
    if (result.error.code === 'WRONG_PASSWORD') {
      return { error: null, fieldError: { currentPassword: result.error.message }, success: false }
    }
    return { error: result.error.message, fieldError: null, success: false }
  }

  return { error: null, fieldError: null, success: true }
}

type Props = { isEmailProvider: boolean }

export function PasswordChangeForm({ isEmailProvider }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState)

  if (!isEmailProvider) {
    return (
      <p className="text-sm text-muted-foreground">
        Your account uses Google sign-in. Password change is not available.
      </p>
    )
  }

  if (state.success) {
    return (
      <p role="status" className="text-sm text-green-600">
        Password updated successfully. Other sessions will be signed out shortly.
      </p>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          aria-describedby={state.fieldError?.currentPassword ? 'currentPassword-error' : undefined}
        />
        {state.fieldError?.currentPassword && (
          <p id="currentPassword-error" role="alert" className="text-sm text-destructive">
            {state.fieldError.currentPassword}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          aria-describedby={state.fieldError?.newPassword ? 'newPassword-error' : undefined}
        />
        {state.fieldError?.newPassword && (
          <p id="newPassword-error" role="alert" className="text-sm text-destructive">
            {state.fieldError.newPassword}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-describedby={state.fieldError?.confirmPassword ? 'confirmPassword-error' : undefined}
        />
        {state.fieldError?.confirmPassword && (
          <p id="confirmPassword-error" role="alert" className="text-sm text-destructive">
            {state.fieldError.confirmPassword}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  )
}
