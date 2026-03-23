'use client'
import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signupSchema, type SignupInput } from '@/lib/validators/auth'
import { signUpWithEmail, signInWithGoogle } from './actions'
import { upgradeAnonymousSession, upgradeWithEmailPassword } from '@/app/cold-start/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

function SignupPageContent() {
  const searchParams = useSearchParams()
  const isUpgrade = searchParams.get('upgrade') === 'true'

  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      tosAccepted: false,
    },
    mode: 'onTouched',
  })

  const tosAccepted = form.watch('tosAccepted')

  async function onSubmit(values: SignupInput) {
    setIsSubmitting(true)
    setServerError(null)
    try {
      const result = isUpgrade
        ? await upgradeWithEmailPassword(values.email, values.password, values.tosAccepted)
        : await signUpWithEmail(values.email, values.password, values.tosAccepted)
      if (result.error) {
        setServerError(result.error.message)
      } else {
        setSuccessMessage(result.data.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    setServerError(null)
    try {
      // tosAccepted is passed to the server action, which validates it and sets the
      // tos_accepted cookie server-side — prevents third-party script pre-forgery.
      const result = isUpgrade
        ? await upgradeAnonymousSession('google', tosAccepted)
        : await signInWithGoogle(tosAccepted)

      if (result.error) {
        setServerError(result.error.message)
        setIsGoogleLoading(false)
        return
      }
      // Must use window.location.href — NOT router.push.
      // OAuth flow requires leaving Next.js routing context entirely.
      window.location.href = result.data.url
    } catch {
      setServerError('Failed to initiate Google sign-in. Please try again.')
      setIsGoogleLoading(false)
    }
  }

  if (successMessage) {
    return (
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted-foreground">{successMessage}</p>
        <p className="text-sm text-muted-foreground">
          Already verified?{' '}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted-foreground">Start learning with spaced repetition</p>
      </div>

      {isUpgrade && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
          <p className="text-sm font-medium text-blue-800">
            Your study progress will be saved to your account
          </p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tosAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value === true}
                    onCheckedChange={(checked) => {
                      field.onChange(checked === true ? true : undefined)
                    }}
                    aria-label="Accept Terms of Service"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal cursor-pointer">
                    I confirm I am 13 or older and agree to the{' '}
                    <Link href="/terms" className="underline" target="_blank" rel="noopener noreferrer">
                      Terms of Service
                    </Link>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {serverError && (
            <p className="text-sm text-destructive" role="alert">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!tosAccepted || isSubmitting}
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </Form>

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
        disabled={!tosAccepted || isGoogleLoading}
        aria-label="Sign up with Google"
      >
        {isGoogleLoading ? 'Redirecting…' : 'Sign up with Google'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageContent />
    </Suspense>
  )
}
