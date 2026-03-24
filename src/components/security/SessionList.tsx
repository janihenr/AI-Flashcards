'use client'

import { useTransition, useState } from 'react'
import { Button } from '@/components/ui/button'
import { revokeSession, revokeOtherSessions } from '@/app/(app)/settings/security/actions'
import { parseUserAgentHint } from '@/lib/utils/parseUserAgent'

export type SessionRow = {
  id: string
  created_at: string
  updated_at: string
  user_agent: string | null
}

type Props = {
  sessions: SessionRow[]
  currentSessionId: string | null
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

export function SessionList({ sessions: initialSessions, currentSessionId }: Props) {
  const [sessions, setSessions] = useState(initialSessions)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const otherSessions = sessions.filter(s => s.id !== currentSessionId)

  function handleRevoke(sessionId: string) {
    if (!confirm('Revoke this session? The device using it will be signed out.')) return
    startTransition(async () => {
      const result = await revokeSession(sessionId)
      if (result.error) {
        setError(result.error.message)
      } else {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
        setError(null)
      }
    })
  }

  function handleRevokeAll() {
    if (!confirm('Sign out all other sessions? Only this session will remain active.')) return
    startTransition(async () => {
      const result = await revokeOtherSessions()
      if (result.error) {
        setError(result.error.message)
      } else {
        setSessions(prev =>
          currentSessionId ? prev.filter(s => s.id === currentSessionId) : prev
        )
        setError(null)
      }
    })
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No active sessions found.</p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-3" aria-label="Active sessions">
        {sessions.map(session => {
          const isCurrent = session.id === currentSessionId
          return (
            <li
              key={session.id}
              className="flex items-start justify-between gap-4 rounded-md border px-4 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {parseUserAgentHint(session.user_agent)}
                  {isCurrent && (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                      Current session
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  Last active {formatRelativeTime(session.updated_at)}
                </span>
              </div>

              {!isCurrent && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleRevoke(session.id)}
                  aria-label={`Revoke session: ${parseUserAgentHint(session.user_agent)}`}
                >
                  Revoke
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {otherSessions.length > 0 && (
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={handleRevokeAll}
          className="w-fit"
        >
          Revoke all other sessions
        </Button>
      )}
    </div>
  )
}
