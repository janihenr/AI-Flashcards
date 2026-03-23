import { validateInviteToken } from '@/server/db/queries/teams'
import { createUserClient } from '@/lib/supabase/user'
import Link from 'next/link'
import InviteAuthForm from './InviteAuthForm'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params

  // Server-side token validation (AC #4)
  const inviteResult = await validateInviteToken(token)

  if (inviteResult.error) {
    return <InviteErrorView code={inviteResult.error.code} />
  }

  const invite = inviteResult.data

  // Check existing session for Task 6 (authenticated user flow)
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthenticated = !!user
  const authenticatedEmail = user?.email ?? null

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">You&apos;ve been invited to a team</h1>
        <p className="text-muted-foreground">
          This invite was sent to <strong>{invite.email}</strong>
        </p>
      </div>

      <InviteAuthForm
        token={token}
        inviteEmail={invite.email}
        isAuthenticated={isAuthenticated}
        authenticatedEmail={authenticatedEmail}
      />
    </div>
  )
}

// ─── Error state (AC #4) ──────────────────────────────────────────────────────
// SECURITY: Never render params.token in error message text — use only static strings
function InviteErrorView({ code }: { code: string | undefined }) {
  return (
    <div className="w-full max-w-md space-y-4 text-center" role="alert">
      <h1 className="text-2xl font-bold">Invalid invite link</h1>
      {code === 'INVITE_EXPIRED' && (
        <p className="text-muted-foreground">
          This invite link has expired. Ask the workspace admin to send a new invite.
        </p>
      )}
      {code === 'INVITE_REVOKED' && (
        <p className="text-muted-foreground">
          This invite has been cancelled. Contact your workspace admin.
        </p>
      )}
      {code === 'INVITE_USED' && (
        <p className="text-muted-foreground">
          This invite has already been used.{' '}
          <Link href="/login" className="underline">
            Log in
          </Link>{' '}
          to your existing account.
        </p>
      )}
      {/* Default fallback: covers INVITE_NOT_FOUND, DB_ERROR, and any other unrecognized code */}
      {code !== 'INVITE_EXPIRED' && code !== 'INVITE_REVOKED' && code !== 'INVITE_USED' && (
        <p className="text-muted-foreground">
          This invite link is not valid. Please check the link in your email and try again.
        </p>
      )}
    </div>
  )
}
