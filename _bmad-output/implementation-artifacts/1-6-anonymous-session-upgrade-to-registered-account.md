# Story 1.6: Anonymous Session Upgrade to Registered Account

Status: ready-for-dev

## Story

As an anonymous user who has studied the cold start deck,
I want to sign up from within the cold start experience and have my anonymous session progress carried over,
So that I don't lose my study history when I convert to a registered account.

## Acceptance Criteria

1. **Given** I am an anonymous user who has rated cards in the cold start session **When** I click the signup CTA at the end of the cold start session **Then** I am shown the signup form (Google or email/password) without leaving the app context

2. **Given** I complete signup **When** `supabase.auth.linkIdentity()` is called **Then** my anonymous session is upgraded to an authenticated account **And** all FSRS review history from the anonymous session is transferred to my new account **And** I am redirected to my personal library **And** the anonymous session is invalidated

3. **Given** the `linkIdentity()` upgrade encounters a concurrent auth conflict **When** the conflict is detected **Then** it is resolved without data loss **And** the event is logged via `log()` for investigation (spike mitigation from Story 1.2 ADR-001)

## Tasks / Subtasks

- [ ] Task 1: Implement `linkIdentity()` upgrade Server Action (AC: #2, #3)
  - [ ] Create `src/app/cold-start/actions.ts`
  - [ ] `upgradeAnonymousSession(provider: 'google' | 'email', credentials?)` Server Action
  - [ ] Call `supabase.auth.linkIdentity()` per ADR-001 mitigation strategy from `docs/adr/001-link-identity-race-condition.md`
  - [ ] Before calling: verify anonymous session is still valid via `supabase.auth.getUser()`
  - [ ] If session already upgraded (identity already linked): log event + redirect to `/decks` (idempotent)
  - [ ] On conflict: log via `log({ action: 'auth.link_identity.conflict', userId })` and recover gracefully
  - [ ] Returns `Result<{ redirectUrl: string }>` — never throws

- [ ] Task 2: Transfer anonymous FSRS review history (AC: #2)
  - [ ] Create `transferAnonymousReviews(anonUserId: string, newUserId: string)` in `src/server/db/queries/reviews.ts`
  - [ ] UPDATE `reviews` SET `user_id = newUserId` WHERE `user_id = anonUserId`
  - [ ] This preserves FSRS state (stability, difficulty, due date) without re-seeding
  - [ ] Wrap in a transaction with the `anonymous_sessions.linked_at` update
  - [ ] Return `Result<{ count: number }>` (number of reviews transferred)

- [ ] Task 3: Update `anonymous_sessions.linked_at` (AC: #2)
  - [ ] Add `markAnonymousSessionLinked(anonUserId: string)` to `src/server/db/queries/users.ts`
  - [ ] UPDATE `anonymous_sessions` SET `linked_at = now()` WHERE `supabase_anon_id = anonUserId`
  - [ ] Call this in the same transaction as `transferAnonymousReviews()`
  - [ ] Uses `createServerAdminClient()` — service role required to bypass RLS on `anonymous_sessions`

- [ ] Task 4: Create upgrade transaction (AC: #2)
  - [ ] Create `completeAnonymousUpgrade(anonUserId, newUserId)` in `src/server/actions/upgrade.ts`
  - [ ] Runs in a Drizzle transaction:
    1. `transferAnonymousReviews(anonUserId, newUserId)`
    2. `markAnonymousSessionLinked(anonUserId)`
  - [ ] If transaction fails: log error, return `Result<null, error>` — DO NOT partially update
  - [ ] Called from auth callback route after `linkIdentity()` succeeds

- [ ] Task 5: Update auth callback to handle anonymous upgrade (AC: #2)
  - [ ] Modify `src/app/api/auth/callback/route.ts` (from Story 1.5)
  - [ ] After `exchangeCodeForSession`, check if previous session was anonymous (`user.is_anonymous` before upgrade)
  - [ ] If upgrading from anonymous: call `completeAnonymousUpgrade(anonUserId, newUserId)`
  - [ ] If new registration: proceed as Story 1.5 (just upsert profile)
  - [ ] Pass `anonUserId` as state parameter in the OAuth redirect URL or session storage

- [ ] Task 6: Update SessionComplete CTA to trigger upgrade (AC: #1)
  - [ ] Modify `src/components/study/SessionComplete.tsx` (from Story 1.4)
  - [ ] "Sign up to save progress" CTA → redirects to `/signup?upgrade=true`
  - [ ] On signup page with `?upgrade=true`: UI hint "Your study progress will be saved to your account"
  - [ ] Pass anonymous user ID via session/URL parameter so callback can run upgrade

- [ ] Task 7: Integration tests (AC: #2, #3)
  - [ ] Create `tests/integration/anonymous-upgrade.test.ts`
  - [ ] Test: `transferAnonymousReviews` correctly reassigns all review `user_id` values
  - [ ] Test: `markAnonymousSessionLinked` sets `linked_at` to non-null timestamp
  - [ ] Test: full transaction rolls back if either step fails (no partial state)
  - [ ] Test: calling `completeAnonymousUpgrade` twice is idempotent (no double-transfer)

## Dev Notes

### ADR-001 Mitigation — Read Before Implementing linkIdentity()

**CRITICAL:** Before calling `supabase.auth.linkIdentity()`, always verify the current anonymous session is still valid. The mitigation strategy is documented in `docs/adr/001-link-identity-race-condition.md` (created in Story 1.2 spike).

```typescript
// Canonical upgrade implementation — per ADR-001 mitigation
export async function upgradeAnonymousSession(
  provider: 'google',
  redirectTo: string
): Promise<Result<{ url: string }>> {
  const supabase = await createUserClient()

  // ADR-001 mitigation: check session is still anonymous before linking
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { data: null, error: { message: 'No active session', code: 'UNAUTHORIZED' } }
  }

  if (!user.is_anonymous) {
    // Already upgraded — idempotent path
    log({ action: 'auth.link_identity.already_upgraded', userId: user.id })
    return { data: { url: redirectTo }, error: null }
  }

  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: { redirectTo },
  })

  if (error) {
    // Conflict detection — concurrent upgrade attempt
    if (error.message.includes('identity_already_exists') || error.status === 422) {
      log({ action: 'auth.link_identity.conflict', userId: user.id, error: error.message })
      // Recover: session may have been upgraded by the other call — proceed to redirect
      return { data: { url: redirectTo }, error: null }
    }
    return { data: null, error: { message: error.message, code: 'AUTH_ERROR' } }
  }

  if (!data?.url) return { data: null, error: { message: 'No OAuth redirect URL returned', code: 'AUTH_ERROR' } }
  return { data: { url: data.url }, error: null }
}
```

### Email/Password Upgrade Path (linkIdentity alternative)

`supabase.auth.linkIdentity()` works for OAuth providers only. For email/password upgrades, use `supabase.auth.updateUser()` instead:

```typescript
// For email/password upgrade from anonymous session:
export async function upgradeWithEmailPassword(
  email: string,
  password: string
): Promise<Result<{ upgraded: true }>> {
  const supabase = await createUserClient()

  // Verify still anonymous
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.is_anonymous) {
    return { data: { upgraded: true }, error: null } // already upgraded — idempotent
  }

  // Convert anonymous session to email/password account
  const { error } = await supabase.auth.updateUser({ email, password })
  if (error) {
    log({ action: 'auth.email_upgrade.failed', userId: user.id, error: error.message })
    return { data: null, error: { message: error.message, code: 'AUTH_ERROR' } }
  }

  // No OAuth redirect needed — session is upgraded in-place
  // Call completeAnonymousUpgrade directly (no cookie needed)
  return { data: { upgraded: true }, error: null }
}
```
Note: For email/password upgrades, call `completeAnonymousUpgrade(user.id, user.id)` is NOT needed — the user ID stays the same after `updateUser`. Only FSRS reviews need `user_id` rewritten for OAuth upgrades where the user gets a new authenticated ID.

### Review Transfer — Drizzle Transaction Pattern

```typescript
// src/server/actions/upgrade.ts
import { db } from '@/server/db'
import { reviews, anonymousSessions } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import type { Result } from '@/types'
import { log } from '@/lib/logger'

export async function completeAnonymousUpgrade(
  anonUserId: string,
  newUserId: string
): Promise<Result<{ reviewsTransferred: number }>> {
  try {
    const result = await db.transaction(async (tx) => {
      // Step 1: Mark session as linked FIRST — protects against cron deletion if tx partially fails
      // If session already purged by cron (linked_at set or row deleted), this update affects 0 rows — that is OK;
      // the reviews transfer still proceeds (reviews may exist even if session row is gone)
      await tx
        .update(anonymousSessions)
        .set({ linkedAt: new Date() })
        .where(eq(anonymousSessions.supabaseAnonId, anonUserId))

      // Step 2: Transfer FSRS reviews
      const updated = await tx
        .update(reviews)
        .set({ userId: newUserId })
        .where(eq(reviews.userId, anonUserId))
        .returning()

      return updated.length
    })

    log({ action: 'auth.anonymous_upgrade.complete', anonUserId, newUserId, reviewsTransferred: result })
    return { data: { reviewsTransferred: result }, error: null }
  } catch (err) {
    log({ action: 'auth.anonymous_upgrade.failed', anonUserId, newUserId, error: String(err) })
    return { data: null, error: { message: 'Upgrade transaction failed', code: 'DB_ERROR' } }
  }
}
```

### Auth Callback Update — Detecting Anonymous Upgrade (sessionStorage approach)

The challenge: after `supabase.auth.linkIdentity()` OAuth redirect, the callback receives a new session for the upgraded user. The anonymous user ID is no longer available from the session.

**Use `sessionStorage`** — survives the OAuth redirect within the same browser tab, requires no Supabase redirect URL whitelist changes, and is cleared automatically when the tab closes.

```typescript
// BEFORE triggering OAuth (in cold-start SessionComplete or upgrade button click):
// Store anon user ID in sessionStorage — survives the OAuth redirect
sessionStorage.setItem('anon_upgrade_id', currentAnonUserId)

// Trigger OAuth as normal — no query params needed:
const redirectTo = `${NEXT_PUBLIC_APP_URL}/api/auth/callback`
await upgradeAnonymousSession('google', redirectTo)
```

```typescript
// In src/app/api/auth/callback/route.ts — this runs server-side
// sessionStorage is client-side only; read it in a client component after the redirect.

// ALTERNATIVE: Use a short-lived cookie instead of sessionStorage for SSR compat:
// Set a cookie BEFORE the OAuth redirect (in the Server Action):
// cookies().set('anon_upgrade_id', anonUserId, { maxAge: 600, httpOnly: true, sameSite: 'lax' })
// Then read it in the callback route:
const anonId = (await cookies()).get('anon_upgrade_id')?.value
if (anonId && data.user && !data.user.is_anonymous) {
  const upgradeResult = await completeAnonymousUpgrade(anonId, data.user.id)
  // Always clear the cookie — on both success AND error — to prevent replay attacks
  const response = upgradeResult.error
    ? NextResponse.redirect(`${origin}/decks`) // proceed on error (non-fatal), log handled inside
    : NextResponse.redirect(`${origin}/decks`)
  response.cookies.delete('anon_upgrade_id')
  return response
}
```

**Recommended implementation:** Set a short-lived httpOnly cookie in a Server Action before triggering the OAuth redirect. Since Server Actions run on the server and can set cookies before the response is sent, `httpOnly: true` is safe here. Read it in the callback route handler (also server-side). **Never use `httpOnly: false`** — that exposes the anonUserId to XSS attacks.

Extend `maxAge` to **600 seconds (10 minutes)** to account for slow OAuth providers or users who pause mid-flow.

Validate the `anon_id` before running upgrade: confirm it exists in `anonymous_sessions` with `linked_at IS NULL` — prevents replay attacks with stale cookie values.

### Data Preservation Guarantee

FSRS review history is preserved by **reassigning the `user_id` column** on existing `reviews` rows — not by copying/re-inserting. This means:
- `stability`, `difficulty`, `state`, `due` in `cards` table are NOT affected — these are per-card, not per-user
- `reviews` rows keep their `created_at`, `rating`, `response_time_ms` exactly
- The anonymous user's study history appears seamlessly as the new account's history
- `Learning Fingerprint Layer 2` begins accumulating from the first authenticated session (behavioral signals start fresh)

### Anonymous Session Constraints (from Architecture)

- Anonymous sessions: FSRS ratings ARE written to `reviews` (legitimate interest basis)
- `presentationMode` and `responseTimeMs` are NOT written for anonymous sessions — these are Layer 2 Learning Fingerprint signals
- `reviews.userId` = anonymous Supabase user ID during cold start
- After upgrade: `reviews.userId` = new authenticated user ID

### File Structure for This Story

New files:
```
src/
  app/
    cold-start/
      actions.ts                      ← NEW: upgradeAnonymousSession() Server Action
  server/
    actions/
      upgrade.ts                      ← NEW: completeAnonymousUpgrade() transaction

Modified files:
  src/app/api/auth/callback/route.ts  ← MODIFY: detect anon upgrade, call completeAnonymousUpgrade
  src/components/study/SessionComplete.tsx ← MODIFY: pass anon_id in signup CTA URL
  src/server/db/queries/reviews.ts    ← MODIFY: add transferAnonymousReviews()
  src/server/db/queries/users.ts      ← MODIFY: add markAnonymousSessionLinked()

New test files:
  tests/integration/anonymous-upgrade.test.ts ← NEW
```

### Architecture Compliance Checklist (Anti-Disaster)

- [ ] `linkIdentity()` called ONLY after `getUser()` confirms session is still anonymous (ADR-001)
- [ ] Conflict error code checked: `identity_already_exists` or status 422 → recover gracefully
- [ ] Conflict events logged via `log()` — required by ADR-001 mitigation
- [ ] `transferAnonymousReviews` + `markAnonymousSessionLinked` in SAME Drizzle transaction
- [ ] Transaction failure → complete rollback, no partial state (reviews NOT partially transferred)
- [ ] `anonymous_sessions` updates use `createServerAdminClient()` — service role bypasses RLS
- [ ] `anonUserId` passed via short-lived httpOnly cookie set in Server Action before OAuth redirect — NOT in URL query params and NOT in localStorage
- [ ] `anon_upgrade_id` cookie: `httpOnly: true`, `maxAge: 600` (10 min), `sameSite: 'lax'` — prevents XSS exfiltration of anonUserId
- [ ] `anon_upgrade_id` validated against DB before running upgrade (must exist with `linked_at IS NULL`)
- [ ] `anon_upgrade_id` cookie ALWAYS cleared in callback (both success and error paths) — prevents stale cookie replay attacks
- [ ] `log()` called for upgrade completion AND failures (auditability)
- [ ] Behavioral signals (presentationMode, responseTimeMs) remain absent from DB for anonymous history
- [ ] **Cron purge safety:** The Story 1.2 `purge-anonymous-sessions` Edge Function purges sessions WHERE `linked_at IS NULL`. If the upgrade transaction fails AFTER `supabase.auth.linkIdentity()` succeeds but BEFORE `markAnonymousSessionLinked()` completes, `linked_at` remains NULL and the cron will eventually DELETE the reviews that now belong to the upgraded user. To prevent this: the Drizzle transaction in `completeAnonymousUpgrade` must set `linked_at` as its FIRST operation (before transferring reviews), so any partial failure leaves a non-null `linked_at` that protects the session from cron deletion.
- [ ] Concurrent upgrade guard: if two callbacks fire simultaneously (e.g., user double-submits or duplicate webhook), the second `completeAnonymousUpgrade` call will find `anonymousSessions.linked_at` already set (from Step 1 of the first call). Add a check: SELECT `linked_at` before transaction; if already non-null, skip and return success (idempotent). This prevents duplicate `reviews.user_id` rewrite attempts.

### Previous Story Intelligence

Story 1.5 established:
- `src/app/api/auth/callback/route.ts` — modify this file to add upgrade detection
- `upsertProfile()` in users.ts — profile creation pattern
- `signInWithGoogle()` pattern — reuse for OAuth-based upgrade

Story 1.4 established:
- `src/components/study/SessionComplete.tsx` — modify CTA to include `anon_id`
- `useStudySessionStore` — anonymous ratings stored here; passed to upgrade flow
- Anonymous session is created in cold-start page via `signInAnonymously()`

Story 1.2 established:
- `docs/adr/001-link-identity-race-condition.md` — **READ THIS BEFORE IMPLEMENTING**
- `anonymous_sessions` table with `linked_at` field
- `createServerAdminClient()` for service-role operations on `anonymous_sessions`
- `log()` function in `src/lib/logger.ts` — use for auth events

### Story Definition of Done

A story is complete when ALL are true:
1. **Integration tests** — Transaction rollback tested; double-upgrade idempotent
2. **ADR-001 compliance** — `getUser()` called before `linkIdentity()`; conflict logged
3. **No data loss** — All `reviews` rows from anonymous session appear under new account
4. **`linked_at` set** — `anonymous_sessions.linked_at` non-null after upgrade
5. **Log events** — `auth.anonymous_upgrade.complete` and conflict cases logged
6. **Result type** — All Server Actions and DAL functions return `Result<T>`

### References

- ADR-001: `docs/adr/001-link-identity-race-condition.md` (created in Story 1.2 spike)
- Anonymous session architecture: `_bmad-output/planning-artifacts/architecture.md` (Cold Start → Auth Handoff)
- `anonymous_sessions` table schema: architecture.md (Data Architecture)
- `reviews` table schema: architecture.md
- `log()` function: `src/lib/logger.ts`
- Story 1.2: `_bmad-output/implementation-artifacts/1-2-supabase-foundation-and-auth-infrastructure.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
