import { createUserClient } from '@/lib/supabase/user'
import { createServerAdminClient } from '@/lib/supabase/server'
import { PasswordChangeForm } from '@/components/security/PasswordChangeForm'
import { SessionList } from '@/components/security/SessionList'
import type { SessionRow } from '@/components/security/SessionList'

export const metadata = { title: 'Security Settings' }

/**
 * Extracts the session_id claim from a Supabase JWT access token.
 * Uses Buffer.from (Node.js) — not atob() which is browser-only.
 */
function getCurrentSessionId(accessToken: string | undefined): string | null {
  if (!accessToken) return null
  try {
    const payloadB64 = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'))
    return typeof payload.session_id === 'string' ? payload.session_id : null
  } catch {
    return null
  }
}

export default async function SecuritySettingsPage() {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  // (app) layout guarantees user is authenticated — null path is unreachable
  if (!user) return null

  const isEmailProvider = user.identities?.some(i => i.provider === 'email') ?? false

  // Get current session to identify which session this browser has
  const { data: { session } } = await supabase.auth.getSession()
  const currentSessionId = getCurrentSessionId(session?.access_token)

  // List all sessions for this user via service-role admin client
  // (auth.sessions is in the auth schema — only accessible with service role)
  const adminClient = createServerAdminClient()
  const { data: sessions, error: sessionsError } = await adminClient
    .schema('auth')
    .from('sessions')
    .select('id, created_at, updated_at, user_agent')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold">Security Settings</h1>

      <section aria-labelledby="password-heading" className="flex flex-col gap-4">
        <h2 id="password-heading" className="text-base font-medium">Change password</h2>
        <PasswordChangeForm isEmailProvider={isEmailProvider} />
      </section>

      <section aria-labelledby="sessions-heading" className="mt-8 flex flex-col gap-4">
        <h2 id="sessions-heading" className="text-base font-medium">Active Sessions</h2>
        {sessionsError ? (
          <p className="text-sm text-destructive">Unable to load sessions. Please try again later.</p>
        ) : (
          <SessionList
            sessions={(sessions ?? []) as SessionRow[]}
            currentSessionId={currentSessionId}
          />
        )}
      </section>
    </div>
  )
}
