# ADR-001: Supabase linkIdentity() Race Condition — Anonymous to Auth Upgrade

## Status: Accepted

## Context

When an anonymous user clicks the signup CTA after the cold start deck session,
`supabase.auth.linkIdentity()` is called to upgrade the anonymous Supabase session to a
registered account. A race condition can occur if:

1. User initiates signup in two browser tabs simultaneously (both tabs hold the same anonymous
   session token and both try to call `linkIdentity()`)
2. Network timeout causes the client to retry `linkIdentity()` while a prior call is still
   in-flight
3. Anonymous session expires between cold start deck completion and signup (user leaves browser
   for >30 days, session is purged by the `purge-anonymous-sessions` Edge Function)
4. User clicks Google OAuth signup button multiple times before the OAuth redirect fires

---

## Findings from Spike

### What Supabase returns on concurrent `linkIdentity()` calls

When `supabase.auth.linkIdentity()` is called for an anonymous session that has already been
upgraded (identity already linked), Supabase Auth returns:

- **HTTP status:** `422 Unprocessable Entity`
- **Error code:** `identity_already_exists`
- **Error message:** `"Identity is already linked to another user"` or `"User already has an
  identity linked for this provider"`

The **first** call succeeds and upgrades the session. Every subsequent call for the same
anonymous user + same provider returns the 422 error above.

### Idempotency guarantee

Supabase does **not** provide native idempotency for `linkIdentity()`. The function is
intentionally non-idempotent by design — calling it twice should be an error state from
Supabase's perspective. The client must detect and handle the `identity_already_exists` error
explicitly.

### Session state after conflict

When the conflict error is returned, the anonymous user's session **may already be upgraded**
by the concurrent first call. Calling `supabase.auth.getUser()` after the conflict error will
return the upgraded (authenticated, non-anonymous) user — the upgrade succeeded, just via the
first call, not this one. This means the conflict error is safe to recover from by redirecting
to the authenticated destination.

### Anonymous session expiry scenario

If the anonymous session has been purged by the cron function before `linkIdentity()` is
called:

- `supabase.auth.getUser()` returns `null` or a `session_not_found` / `unauthorized` error
- `linkIdentity()` will fail with an auth error (no active session)
- Reviews written during the cold start session will have already been hard-deleted by the cron
- **Recovery:** redirect user to cold start deck with a "Your session expired" message; no data
  can be recovered

### OAuth-specific behavior

`linkIdentity()` for OAuth providers (Google) initiates a redirect flow — it does not complete
synchronously. The actual identity linking happens in the auth callback route after Google
returns. This means:

- The race condition between two tabs is most likely to manifest in the **callback route**, not
  at the `linkIdentity()` call site
- The callback for the first tab completes the upgrade; the callback for the second tab may
  arrive after the anonymous session is already upgraded
- Both tabs will trigger `completeAnonymousUpgrade()` in the callback — this must be idempotent

---

## Decision

### Mitigation Strategy: Pre-Call Validation + Conflict-Tolerant Recovery

**Two-layer defense:**

**Layer 1 — Pre-call guard (call site, before initiating OAuth redirect):**

Before calling `linkIdentity()`, verify the current session is still anonymous via
`supabase.auth.getUser()`. If `user.is_anonymous === false`, the session is already upgraded —
skip `linkIdentity()` and redirect to `/decks` (idempotent path). Log the event via `log()`
for investigation.

```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user?.is_anonymous) {
  log({ action: 'auth.link_identity.already_upgraded', userId: user?.id })
  return { data: { url: redirectTo }, error: null }
}
// Proceed with linkIdentity()
```

**Layer 2 — Conflict detection (after `linkIdentity()` call):**

If `linkIdentity()` returns an error with `identity_already_exists` or HTTP 422, treat it as a
recoverable conflict — the upgrade was completed by a concurrent call. Log the conflict and
proceed to redirect rather than surfacing an error to the user.

```typescript
if (error.message.includes('identity_already_exists') || error.status === 422) {
  log({ action: 'auth.link_identity.conflict', userId: user.id, error: error.message })
  return { data: { url: redirectTo }, error: null } // recover gracefully
}
```

**Layer 3 — Callback idempotency (`completeAnonymousUpgrade`):**

The Drizzle transaction in `completeAnonymousUpgrade` must guard against double execution. The
transaction sets `anonymous_sessions.linked_at` as its **first** step. If two callbacks fire
concurrently:

- First callback sets `linked_at = now()` and transfers reviews
- Second callback: SELECT `linked_at` before starting transaction; if already non-null, skip
  transaction and return success

```typescript
// Guard at start of completeAnonymousUpgrade():
const session = await db.query.anonymousSessions.findFirst({
  where: eq(anonymousSessions.supabaseAnonId, anonUserId),
})
if (session?.linkedAt !== null) {
  // Already upgraded — idempotent return
  log({ action: 'auth.anonymous_upgrade.already_done', anonUserId })
  return { data: { reviewsTransferred: 0 }, error: null }
}
```

### Anonymous Session Expiry Handling

If `supabase.auth.getUser()` returns no user or an unauthorized error before `linkIdentity()`:

- Return `Result<null, error>` with code `SESSION_EXPIRED`
- UI shows: "Your session has expired. Start a new study session to sign up."
- Redirect user to `/cold-start` (not to signup)
- **Never** attempt `linkIdentity()` with no active session

### Cron Purge Safety

The `purge-anonymous-sessions` Edge Function purges sessions where `linked_at IS NULL`. To
prevent data loss if `linkIdentity()` succeeds but the callback Drizzle transaction partially
fails:

- The transaction MUST set `linked_at = now()` as its **first operation** before transferring
  reviews
- If the transaction fails after setting `linked_at` but before transferring reviews, the session
  row is protected from cron deletion (linked_at is non-null)
- On retry, the reviews transfer will succeed (reviews still belong to anonUserId, linked_at is
  already set)

---

## Implementation Notes

- Story 1.6 implements the actual `linkIdentity()` call and `completeAnonymousUpgrade()`
  transaction based on this ADR
- All conflict events MUST be logged via `log()` — required fields: `action`, `userId`,
  `error` (message only, no stack traces or PII)
- The `anonymous_sessions.linked_at` column is set to `now()` on successful upgrade as the
  first step in the Drizzle transaction
- `anonUserId` is passed from the signup page to the auth callback via a short-lived
  `httpOnly` cookie (`anon_upgrade_id`, `maxAge: 600`, `sameSite: 'lax'`) — never via URL
  params or localStorage
- The `anon_upgrade_id` cookie must be validated against DB before running upgrade (must
  exist with `linked_at IS NULL`) to prevent stale cookie replay attacks
- The `anon_upgrade_id` cookie must be cleared in the callback on BOTH success and error paths
- For email/password upgrades (not OAuth), use `supabase.auth.updateUser()` instead of
  `linkIdentity()` — the user ID remains the same, so `completeAnonymousUpgrade()` is NOT
  needed (no `user_id` rewrite required on reviews)

---

## Consequences

**Positive:**
- Zero user-visible errors for the common concurrent-tab or retry scenarios
- No data loss: reviews are protected against cron deletion by the `linked_at` guard
- Idempotent callback handles duplicate OAuth callbacks cleanly
- All conflict events are auditable via structured logs

**Negative:**
- `completeAnonymousUpgrade` requires a pre-transaction SELECT to check `linked_at` — adds
  one extra DB read per upgrade call (acceptable given upgrade happens once per user)
- The Layer 1 pre-call `getUser()` check adds one extra Supabase Auth API call before OAuth
  redirect — acceptable latency tradeoff for correctness

---

## References

- Supabase Auth docs: [Anonymous sign-ins](https://supabase.com/docs/guides/auth/anonymous-logins)
- Supabase Auth docs: [Link identity](https://supabase.com/docs/reference/javascript/auth-linkidentity)
- Story 1.2: `_bmad-output/implementation-artifacts/1-2-supabase-foundation-and-auth-infrastructure.md`
- Story 1.6: `_bmad-output/implementation-artifacts/1-6-anonymous-session-upgrade-to-registered-account.md`
- Architecture: `_bmad-output/planning-artifacts/architecture.md` (Cold Start → Auth Handoff section)
