# Story 2.3: Active Session View & Revocation

Status: done

## Story

As a registered user,
I want to view all my active sessions and revoke individual ones,
so that I can detect and remove unauthorized access.

## Acceptance Criteria

1. **Given** I am on the security settings page **When** I view the Active Sessions section **Then** I see a list of all active sessions with: device/browser hint, last active time **And** my current session is labeled "Current session"

2. **Given** I click "Revoke" on a non-current session **When** the action is confirmed **Then** that session is invalidated immediately and removed from the list **And** the revoked session cannot be used to authenticate

3. **Given** I click "Revoke all other sessions" **When** I confirm **Then** all sessions except the current one are invalidated in one action

## Tasks / Subtasks

- [x] Task 1: Fetch and display session list (AC: #1)
  - [x] Modify `src/app/(app)/settings/security/page.tsx` — replace the `{/* Story 2.3 will add an Active Sessions section here */}` placeholder with a `<SessionList>` section; pass `sessions` array and `currentSessionId` as props
  - [x] Use `createServerAdminClient()` to query `auth.sessions` table (service role required — bypasses RLS on the `auth` schema)
  - [x] Query: `adminClient.schema('auth').from('sessions').select('id, created_at, updated_at, user_agent').eq('user_id', user.id).order('updated_at', { ascending: false })`
  - [x] Identify current session: decode JWT access_token to extract `session_id` claim (see Dev Notes for utility function)
  - [x] Parse `user_agent` string to produce a human-readable device/browser hint (see Dev Notes)

- [x] Task 2: `SessionList` client component (AC: #1, #2, #3)
  - [x] Create `src/components/security/SessionList.tsx` — Client Component
  - [x] Props: `{ sessions: SessionRow[], currentSessionId: string | null }`
  - [x] Display each session: device hint, "Last active" formatted time, "Current session" badge for current, "Revoke" button for non-current sessions
  - [x] "Revoke" button calls `revokeSession(sessionId)` Server Action and optimistically removes the row from local state on success
  - [x] "Revoke all other sessions" button calls `revokeOtherSessions()` — only render if there are non-current sessions
  - [x] Show confirmation before revoke (inline or simple `window.confirm`) — not a full dialog; this is low-stakes enough that confirm is adequate
  - [x] Show inline error message with `role="alert"` on action failure (same WCAG pattern as `PasswordChangeForm`)
  - [x] Use `useTransition` (not `useActionState`) — revocation does not need persistent form state; just pending indicator per button

- [x] Task 3: `revokeSession` Server Action (AC: #2)
  - [x] Add to `src/app/(app)/settings/security/actions.ts`
  - [x] `revokeSession(sessionId: string): Promise<Result<void>>`
    1. `getUser()` via user client — return `UNAUTHORIZED` if no user
    2. Delete session with double `eq('id', sessionId).eq('user_id', user.id)` — ownership enforced at DB level; empty result → `NOT_FOUND`
    3. Return `{ data: undefined, error: null }` on success

- [x] Task 4: `revokeOtherSessions` Server Action (AC: #3)
  - [x] Add to `src/app/(app)/settings/security/actions.ts`
  - [x] `revokeOtherSessions(): Promise<Result<void>>`
    1. `getUser()` via user client — return `UNAUTHORIZED` if no user
    2. Call `userClient.auth.signOut({ scope: 'others' })` — immediately invalidates all non-current sessions server-side
    3. Return `{ data: undefined, error: null }` on success

- [x] Task 5: Tests (AC: #1, #2, #3)
  - [x] Create `tests/integration/session-revocation.test.ts` — 14 tests, all passing
    - revokeSession auth guard: getUser fails → UNAUTHORIZED
    - revokeSession auth guard: getUser error → UNAUTHORIZED
    - revokeSession ownership: no rows deleted → NOT_FOUND
    - revokeSession delete failure: DB error → AUTH_ERROR
    - revokeSession success: returns { data: undefined, error: null }
    - revokeSession success: schema('auth') called, IDOR guard verified
    - revokeSession: admin client not called when unauthenticated
    - revokeOtherSessions auth guard: getUser fails → UNAUTHORIZED
    - revokeOtherSessions failure: signOut error → AUTH_ERROR
    - revokeOtherSessions success: returns { data: undefined, error: null }
    - revokeOtherSessions success: signOut called with { scope: 'others' }
    - revokeOtherSessions: signOut not called when unauthenticated
    - Contract tests for both functions
  - [x] Mock pattern: mock both `@/lib/supabase/user` (user client) and `@/lib/supabase/server` (admin client)

## Dev Notes

### Architecture Compliance

- **Result<T>:** All Server Actions return `Result<T>` from `@/types`. `Result<void>` success = `{ data: undefined, error: null }`.
- **Auth pattern:** Always `getUser()` server-side before any mutation — never trust client-provided userId.
- **Admin client for session access:** `auth.sessions` is in the `auth` schema — only accessible via service role client. Use `createServerAdminClient()` from `@/lib/supabase/server`. Never use this client for user-facing reads in RSCs (only for privileged operations).
- **IDOR prevention:** `revokeSession` MUST verify the session_id belongs to the authenticated user before deleting. The double `eq('user_id', user.id)` on the delete ensures this at the DB level even if the ownership check query is skipped.
- **`(app)` auth guard:** Already handled by `src/app/(app)/layout.tsx` — no redirect needed in the security page.

### Accessing `auth.sessions` via Admin Client

```typescript
// In Server Component (page.tsx)
import { createServerAdminClient } from '@/lib/supabase/server'
import { createUserClient } from '@/lib/supabase/user'

const userClient = await createUserClient()
const adminClient = createServerAdminClient()

const { data: { user } } = await userClient.auth.getUser()
if (!user) redirect('/login')

const { data: sessions } = await adminClient
  .schema('auth')
  .from('sessions')
  .select('id, created_at, updated_at, user_agent')
  .eq('user_id', user.id)
  .order('updated_at', { ascending: false })
```

`auth.sessions` relevant columns:
- `id` — session UUID (matches `session_id` claim in JWT)
- `user_id` — owner's auth UUID
- `created_at` — when session was created
- `updated_at` — last activity / last token refresh (use as "last active")
- `user_agent` — raw User-Agent string (may be null for older sessions)

### Identifying the Current Session

The current session's ID is embedded as `session_id` in the JWT access_token. Extract it server-side:

```typescript
// In page.tsx — after getUser(), get the session to extract current session_id
const { data: { session } } = await userClient.auth.getSession()

function getCurrentSessionId(accessToken: string | undefined): string | null {
  if (!accessToken) return null
  try {
    // Base64url → base64 → JSON parse
    const payload = JSON.parse(
      Buffer.from(
        accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString('utf-8')
    )
    return payload.session_id ?? null
  } catch {
    return null
  }
}

const currentSessionId = getCurrentSessionId(session?.access_token)
```

Use `Buffer.from(..., 'base64').toString('utf-8')` in Node.js (Next.js server environment) — not `atob()` (browser-only).

### Session Revocation Implementation

**Individual revocation** — deletes the session row directly from `auth.sessions`:

```typescript
// In revokeSession() Server Action
const adminClient = createServerAdminClient()

// Ownership check first (prevents IDOR)
const { data: existing } = await adminClient
  .schema('auth')
  .from('sessions')
  .select('id')
  .eq('id', sessionId)
  .eq('user_id', user.id)
  .single()

if (!existing) {
  return { data: null, error: { message: 'Session not found', code: 'NOT_FOUND' } }
}

const { error } = await adminClient
  .schema('auth')
  .from('sessions')
  .delete()
  .eq('id', sessionId)
  .eq('user_id', user.id)   // belt-and-suspenders: user_id check on delete itself

if (error) {
  return { data: null, error: { message: 'Failed to revoke session', code: 'AUTH_ERROR' } }
}
```

When the session row is deleted, that session's JWT becomes immediately invalid — Supabase GoTrue validates the `session_id` claim against the `auth.sessions` table on every token use.

**Revoke all others** — uses user-client signOut:

```typescript
// In revokeOtherSessions() Server Action
const userClient = await createUserClient()
const { error } = await userClient.auth.signOut({ scope: 'others' })
if (error) {
  return { data: null, error: { message: 'Failed to revoke sessions', code: 'AUTH_ERROR' } }
}
return { data: undefined, error: null }
```

This invalidates all non-current sessions immediately (unlike password change which is async within JWT TTL).

### Device/Browser Hint Parsing

Parse `user_agent` to produce a short human-readable label. Keep this simple — no external library needed:

```typescript
// src/lib/utils/parseUserAgent.ts (or inline in the page/component)
export function parseUserAgentHint(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Unknown device'

  const ua = userAgent.toLowerCase()

  // Browser detection
  let browser = 'Browser'
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome'
  else if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
  else if (ua.includes('edg')) browser = 'Edge'

  // OS detection
  let os = ''
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS'
  else if (ua.includes('iphone')) os = 'iPhone'
  else if (ua.includes('ipad')) os = 'iPad'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('linux')) os = 'Linux'

  return os ? `${browser} on ${os}` : browser
}
```

This file should be a pure utility placed in `src/lib/utils/` (new directory, consistent with `src/lib/validators/` structure).

### `SessionList` Component Pattern

Unlike `PasswordChangeForm` which uses `useActionState` (persistent form state), sessions use `useTransition` — stateless optimistic update:

```typescript
'use client'
import { useTransition, useState } from 'react'
import { revokeSession, revokeOtherSessions } from '@/app/(app)/settings/security/actions'

export type SessionRow = {
  id: string
  created_at: string
  updated_at: string
  user_agent: string | null
}

type Props = { sessions: SessionRow[]; currentSessionId: string | null }

export function SessionList({ sessions: initialSessions, currentSessionId }: Props) {
  const [sessions, setSessions] = useState(initialSessions)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleRevoke(sessionId: string) {
    if (!confirm('Revoke this session?')) return
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
  // ...
}
```

Format `updated_at` using `Intl.DateTimeFormat` or a simple relative time: "2 hours ago", "3 days ago". No external date library needed for basic relative time.

### Security Settings Page Structure Update

Replace the placeholder comment in `page.tsx`:

```tsx
{/* Story 2.3 will add an Active Sessions section here */}
```

With:

```tsx
<section aria-labelledby="sessions-heading" className="mt-8 flex flex-col gap-4">
  <h2 id="sessions-heading" className="text-base font-medium">Active Sessions</h2>
  <SessionList sessions={sessions ?? []} currentSessionId={currentSessionId} />
</section>
```

The `<main>` max-width container and section-based layout established in Story 2.2 is the correct pattern to follow.

### File Structure

**Modified files:**
- `src/app/(app)/settings/security/page.tsx` — add Sessions section (replace placeholder comment)
- `src/app/(app)/settings/security/actions.ts` — add `revokeSession`, `revokeOtherSessions`

**New files:**
- `src/components/security/SessionList.tsx` — Client Component for session display and revocation
- `src/lib/utils/parseUserAgent.ts` — pure utility for UA string → human-readable hint
- `tests/integration/session-revocation.test.ts` — integration tests for both Server Actions

**No new migrations, no new DB schema** — this story reads/deletes from the built-in `auth.sessions` table via service role; no Drizzle schema changes required.

**No new env vars** — `SUPABASE_SECRET_KEY` already required by `createServerAdminClient()` (used in Story 1.x).

### Testing Pattern

Mock both clients in integration tests:

```typescript
vi.mock('@/lib/supabase/user', () => ({ createUserClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createServerAdminClient: vi.fn() }))

// Admin client mock needs schema() chaining:
const mockSchemaFn = vi.fn()
const mockFromFn = vi.fn()
const mockSelectFn = vi.fn()
const mockDeleteFn = vi.fn()
const mockEqFn = vi.fn()
const mockSingleFn = vi.fn()

// Chain: .schema('auth').from('sessions').select('id').eq(...).single()
mockAdminClient.schema.mockReturnValue({ from: mockFromFn })
mockFromFn.mockReturnValue({ select: mockSelectFn, delete: vi.fn().mockReturnValue({ eq: mockEqFn }) })
mockSelectFn.mockReturnValue({ eq: mockEqFn })
mockEqFn.mockReturnValue({ eq: mockEqFn, single: mockSingleFn })
```

Follow the mock chaining pattern established in `tests/integration/anonymous-upgrade.test.ts`.

### Previous Story Learnings (from Stories 2.1 & 2.2)

- **`createUserClient()`** imported from `@/lib/supabase/user`, **`createServerAdminClient()`** from `@/lib/supabase/server`.
- **`(app)` layout** already has auth guard — no duplicate redirect needed in page.tsx. But `getUser()` is still called in page.tsx for data fetching (to get `user.id` for the admin query).
- **shadcn/ui primitives:** Use `Button` from `@/components/ui/button` for Revoke buttons.
- **`Result<void>` void success:** `{ data: undefined, error: null }` — NOT `{ data: null, error: null }`.
- **Zod v4 error syntax:** `{ error: '...' }` not `{ message: '...' }` (relevant if any schema added).
- **Security page section layout:** Story 2.2 established section-based layout with `aria-labelledby` — continue this pattern for the Sessions section.
- **No `revalidatePath`** needed after session revocation — the `SessionList` uses optimistic local state removal (`useState`), so the RSC list is not re-fetched (sessions change rarely; fresh data on next full page load is acceptable).

### Cross-Story Awareness

Story 2.4 (GDPR Personal Data Export) and 2.5 (Personal Data Summary) are on a `/settings/privacy` page, not the security settings page — no shared UI with this story. The security page (`/settings/security`) hosts only password change (2.2) and sessions (2.3).

### References

- Architecture: Session Revocation vs Password Change [Source: `_bmad-output/planning-artifacts/architecture.md#Authentication--Security`]
- Architecture: `createServerAdminClient()` service role client [Source: `_bmad-output/planning-artifacts/architecture.md` — `src/lib/supabase/server.ts`]
- FR11: Session list and revocation requirement [Source: `_bmad-output/planning-artifacts/epics.md`]
- Epic 2 Story 2.3 acceptance criteria [Source: `_bmad-output/planning-artifacts/epics.md`]
- Supabase: `auth.sessions` table and `session_id` JWT claim [Source: Context7 /supabase/supabase — sessions.mdx]
- Supabase: `signOut({ scope: 'others' })` for bulk non-current session revocation [Source: Context7 /supabase/supabase — signout.mdx]
- Previous story patterns [Source: `_bmad-output/implementation-artifacts/2-2-password-change.md`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Implementation Notes

Implemented all 5 tasks. Key decisions:
- `revokeSession` uses a single `.delete().eq('id').eq('user_id').select('id')` instead of separate ownership-check + delete. This is a single DB round-trip; empty result means NOT_FOUND; the double `eq('user_id', user.id)` enforces ownership at the DB level, preventing IDOR.
- Current session identified by decoding JWT `session_id` claim via `Buffer.from(base64, 'base64').toString('utf-8')` — Node.js pattern (not `atob` which is browser-only).
- `SessionList` uses `useTransition` + local `useState` for optimistic removal — no `revalidatePath` needed; session data freshness on next full page load is acceptable.
- `parseUserAgent` checks `edg/` before `chrome` to correctly identify Edge (which includes 'chrome' in its UA string). Similarly, checks `iphone`/`ipad` before `macintosh` since iPad UA includes 'macintosh' on iPadOS.
- Test mock factory declared `eqFn` with `vi.fn()` first, then called `.mockReturnValue()` separately to avoid TypeScript/V8 TDZ circular-reference error.

### Debug Log

- Admin mock chain: `eqFn` self-reference in `mockReturnValue` caused TDZ error; fixed by separating declaration and `.mockReturnValue()` call.
- `revokeSession` implementation streamlined from two-step (ownership check + delete) to single-step (delete with double `eq` + `select('id')` to detect empty result).

### Completion Notes List

Marked review — manual tests deferred to frontend integration phase.

All code, Server Actions, and unit/integration tests are complete and passing. Manual E2E validation is blocked because the login UI and navigation are not yet in place (login gets stuck on email auth; Google auth redirects to /terms before reaching the app). Revisit when the frontend auth flow is complete.

- ⚙️ Manual testing deferred: Full session list UI at `/settings/security` — requires working login and app navigation
- ⚙️ Manual testing deferred: "Current session" badge and per-session Revoke — requires real authenticated session
- ⚙️ Manual testing deferred: Multi-session revocation across browser tabs
- 🎯 Playwright E2E deferred: AC1 display assertions (badges, device hints, timestamps) — add to tests/e2e/security-sessions.spec.ts when frontend is ready

### File List

**New:**
- `src/lib/utils/parseUserAgent.ts`
- `src/lib/utils/parseUserAgent.test.ts`
- `src/components/security/SessionList.tsx`
- `tests/integration/session-revocation.test.ts`

**Modified:**
- `src/app/(app)/settings/security/page.tsx` — added session list data fetching and Sessions section
- `src/app/(app)/settings/security/actions.ts` — added `revokeSession`, `revokeOtherSessions`
- `_bmad-output/implementation-artifacts/2-3-active-session-view-and-revocation.md` — story tracking
