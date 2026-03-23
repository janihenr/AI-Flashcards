'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  acceptTeamInvite,
  signUpForInvite,
  signInAndAcceptInvite,
  signInWithGoogleForInvite,
} from './actions'

type AuthMode = 'signup' | 'login'

interface InviteAuthFormProps {
  token: string
  inviteEmail: string
  isAuthenticated: boolean
  authenticatedEmail: string | null
}

export default function InviteAuthForm({
  token,
  inviteEmail,
  isAuthenticated,
  authenticatedEmail,
}: InviteAuthFormProps) {
  const [mode, setMode] = useState<AuthMode>('signup')
  const [password, setPassword] = useState('')
  const [tosAccepted, setTosAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Task 6: Authenticated user — show "Join team" confirmation button
  if (isAuthenticated) {
    return (
      <AuthenticatedJoinView
        token={token}
        inviteEmail={inviteEmail}
        authenticatedEmail={authenticatedEmail}
      />
    )
  }

  if (successMessage) {
    return (
      <div className="w-full max-w-md space-y-4 text-center">
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-muted-foreground">{successMessage}</p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setServerError(null)

    try {
      if (mode === 'signup') {
        const result = await signUpForInvite(token, inviteEmail, password, tosAccepted)
        if (result.error) {
          setServerError(result.error.message)
        } else {
          setSuccessMessage(result.data.message)
        }
      } else {
        const result = await signInAndAcceptInvite(token, inviteEmail, password)
        if (result.error) {
          setServerError(result.error.message)
        } else {
          window.location.href = result.data.redirectUrl
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    setServerError(null)
    try {
      if (mode === 'signup') {
        // Set tos_accepted cookie before OAuth redirect (GDPR Article 7 compliance)
        document.cookie = 'tos_accepted=true; path=/; max-age=300; samesite=lax'
      }

      const result = await signInWithGoogleForInvite(token)
      if (result.error) {
        setServerError(result.error.message)
        setIsGoogleLoading(false)
        return
      }
      // Must use window.location.href — NOT router.push (OAuth requires leaving Next.js routing)
      window.location.href = result.data.url
    } catch {
      setServerError('Failed to initiate Google sign-in. Please try again.')
      setIsGoogleLoading(false)
    }
  }

  const isSignup = mode === 'signup'
  const canSubmit = isSignup ? tosAccepted && password.length >= 8 : password.length > 0

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Mode toggle */}
      <div className="flex rounded-lg border p-1 text-sm">
        <button
          type="button"
          onClick={() => { setMode('signup'); setServerError(null) }}
          className={`flex-1 rounded-md py-1.5 text-center transition-colors ${
            isSignup ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => { setMode('login'); setServerError(null) }}
          className={`flex-1 rounded-md py-1.5 text-center transition-colors ${
            !isSignup ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Log in
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Email — pre-filled and read-only (AC #1: prevent changing email) */}
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={inviteEmail}
            readOnly
            disabled
            aria-label="Email address (pre-filled from invite)"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invite-password">Password</Label>
          <Input
            id="invite-password"
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={isSignup ? 8 : undefined}
            required
          />
        </div>

        {isSignup && (
          <div className="flex flex-row items-start space-x-3">
            <Checkbox
              id="invite-tos"
              checked={tosAccepted}
              onCheckedChange={(checked) => setTosAccepted(checked === true)}
              aria-label="Accept Terms of Service"
            />
            <Label htmlFor="invite-tos" className="font-normal cursor-pointer leading-snug">
              I confirm I am 13 or older and agree to the{' '}
              <Link href="/terms" className="underline" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </Link>
            </Label>
          </div>
        )}

        {serverError && (
          <p className="text-sm text-destructive" role="alert">
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting
            ? isSignup ? 'Creating account…' : 'Logging in…'
            : isSignup ? 'Create account & join team' : 'Log in & join team'
          }
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={(isSignup && !tosAccepted) || isGoogleLoading}
        aria-label="Continue with Google"
      >
        {isGoogleLoading ? 'Redirecting…' : 'Continue with Google'}
      </Button>
    </div>
  )
}

// ─── Authenticated user join confirmation (Task 6) ────────────────────────────
function AuthenticatedJoinView({
  token,
  inviteEmail,
  authenticatedEmail,
}: {
  token: string
  inviteEmail: string
  authenticatedEmail: string | null
}) {
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Email mismatch — show clear error before even attempting acceptance
  const emailMismatch =
    authenticatedEmail &&
    authenticatedEmail.toLowerCase() !== inviteEmail.toLowerCase()

  async function handleJoin() {
    setIsJoining(true)
    setError(null)
    try {
      const result = await acceptTeamInvite(token)
      if (result.error) {
        setError(result.error.message)
      } else {
        window.location.href = `/decks?team=${result.data.teamId}`
      }
    } finally {
      setIsJoining(false)
    }
  }

  if (emailMismatch) {
    return (
      <div className="space-y-4" role="alert">
        <p className="text-sm text-destructive">
          You are signed in as <strong>{authenticatedEmail}</strong>, but this invite was sent to{' '}
          <strong>{inviteEmail}</strong>. Please sign out and sign in with the correct account.
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            Sign in with a different account
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        You are signed in as <strong>{authenticatedEmail ?? inviteEmail}</strong>.
      </p>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        onClick={handleJoin}
        disabled={isJoining}
        className="w-full"
      >
        {isJoining ? 'Joining…' : 'Join team'}
      </Button>
    </div>
  )
}
