'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { requestPasswordReset, updatePassword } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── State 2: Confirmation after sending reset link ───────────────────────────
function ConfirmationState() {
  return (
    <div className="w-full max-w-md space-y-4 text-center">
      <h1 className="text-2xl font-bold">Check your email</h1>
      <p className="text-muted-foreground">
        If an account exists for that email, we&apos;ve sent a password reset link.
      </p>
      <p className="text-sm text-muted-foreground">
        Didn&apos;t get it?{' '}
        <Link href="/reset-password" className="underline">
          Try again
        </Link>
      </p>
    </div>
  )
}

// ─── State 3: Set new password (after clicking recovery email link) ───────────
function UpdatePasswordState() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sessionValid, setSessionValid] = useState<boolean | null>(null)

  // Recovery session guard: require both a valid Supabase session AND the recovery_flow
  // cookie set by the callback route. This prevents regular logged-in users from accessing
  // the password-update form without going through the recovery email link.
  useEffect(() => {
    async function checkSession() {
      const hasRecoveryCookie = document.cookie.split(';').some(c => c.trim() === 'recovery_flow=1')
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      setSessionValid(!!user && hasRecoveryCookie)
    }
    checkSession()
  }, [])

  if (sessionValid === null) {
    // Loading — checking session
    return (
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="text-muted-foreground">Verifying your reset link…</p>
      </div>
    )
  }

  if (!sessionValid) {
    // No valid recovery session — redirect user to State 1 with explanation
    return (
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">Link expired</h1>
        <p className="text-muted-foreground">
          Your reset link has expired — please request a new one.
        </p>
        <Link href="/reset-password">
          <Button className="w-full">Request new link</Button>
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await updatePassword(newPassword)
      if (result.error) {
        setError(result.error.message)
        if (result.error.code === 'AUTH_ERROR') {
          // Expired or already-used token — send back to State 1
          setTimeout(() => router.push('/reset-password'), 2000)
        }
      } else {
        router.push('/decks')
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Set new password</h1>
        <p className="text-muted-foreground">Choose a strong password for your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </div>
  )
}

// ─── State 1: Request reset link ──────────────────────────────────────────────
function RequestResetState() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (sent) return <ConfirmationState />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Client-side guard: catch empty email before hitting the server
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await requestPasswordReset(email)
      if (result.error) {
        setError(result.error.message)
      } else {
        setSent(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

// ─── Page router ──────────────────────────────────────────────────────────────
function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const step = searchParams.get('step')

  if (step === 'update') return <UpdatePasswordState />
  return <RequestResetState />
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  )
}
