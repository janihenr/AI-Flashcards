# Story 1.8: User Login & Logout

Status: ready-for-dev

## Story

As a registered user,
I want to log in to my account and log out when I am done,
So that I can securely access my personal data and end my session when needed.

## Acceptance Criteria

1. **Given** I am on the login page and submit valid credentials (email/password or Google) **When** authentication succeeds **Then** I am redirected to my personal library **And** a JWT with refresh token rotation is issued (NFR-SEC3)

2. **Given** I submit incorrect credentials **When** authentication fails **Then** an error message is displayed that does not reveal whether the email or password is wrong

3. **Given** I am logged in and click "Log out" **When** the action is confirmed **Then** my session is invalidated server-side **And** I am redirected to the homepage (cold start experience) **And** the JWT cannot be used after logout

## Tasks / Subtasks

- [ ] Task 1: Create login page (AC: #1, #2)
  - [ ] Create `src/app/(auth)/login/page.tsx` (Client Component — form requires interactivity)
  - [ ] Use shadcn/ui `Form`, `Input`, `Button` components
  - [ ] Form fields: email, password
  - [ ] Google OAuth button: triggers `signInWithGoogle()` (reuse from Story 1.5 actions, or call directly)
  - [ ] Email/password submit: calls `signInWithEmail` Server Action
  - [ ] Error display: generic message only — "Invalid email or password" (NEVER "Email not found" or "Wrong password")
  - [ ] Loading state on submit button
  - [ ] Link to signup: `/signup`
  - [ ] Link to password reset: `/reset-password`

- [ ] Task 2: Create login Server Action (AC: #1, #2)
  - [ ] Create `src/app/(auth)/login/actions.ts`
  - [ ] `signInWithEmail(email, password)` — calls `supabase.auth.signInWithPassword()`
  - [ ] On success: returns `Result<{ redirectUrl: '/decks' }>`
  - [ ] On error: returns `Result<null, { message: 'Invalid email or password', code: 'AUTH_INVALID_CREDENTIALS' }>`
  - [ ] **NEVER** pass Supabase's raw error message to client — always use generic message
  - [ ] JWT rotation is automatic via `@supabase/ssr` + middleware session refresh — no custom handling needed

- [ ] Task 3: Create logout Server Action (AC: #3)
  - [ ] Create `src/app/(app)/actions.ts` (or add to existing if it exists)
  - [ ] `logout()` Server Action — calls `supabase.auth.signOut()` + `revalidatePath('/')`
  - [ ] Clears HTTP-only session cookie (handled automatically by `@supabase/ssr`)
  - [ ] Returns `Result<void>` — client redirects to `/` after success
  - [ ] Called from AppNav "Log out" button (modify `AppNav.tsx` from Story 1.4)

- [ ] Task 4: Wire logout button in AppNav (AC: #3)
  - [ ] Modify `src/components/shared/AppNav.tsx` (created in Story 1.4 or scaffold)
  - [ ] "Log out" button calls `logout()` Server Action
  - [ ] After logout: `router.push('/')` via `useRouter()` to redirect to cold start
  - [ ] Show loading state during logout (prevent double-click)

- [ ] Task 5: Verify middleware redirect on login (AC: #1)
  - [ ] `src/middleware.ts` already redirects `/(app)/*` → `/login` for unauthenticated users (Story 1.2)
  - [ ] Verify redirect includes `?redirectTo={original_path}` for post-login redirect
  - [ ] Login callback should honor `redirectTo` param if present, else default to `/decks`
  - [ ] Update auth callback route: check `redirectTo` param after successful login

- [ ] Task 6: Implement basic password reset (AC: accessibility — prevents 404 on linked page)
  - [ ] Create `src/app/(auth)/reset-password/page.tsx` — two-state page:
    - **State 1 (request):** Email input + "Send reset link" button
    - **State 2 (confirmation):** "Check your email for a reset link" message
  - [ ] Create `src/app/(auth)/reset-password/actions.ts`:
    ```typescript
    'use server'
    export async function requestPasswordReset(email: string): Promise<Result<{ sent: true }>> {
      const supabase = await createUserClient()
      // Always return success — never reveal whether email exists (same principle as login)
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?type=recovery`,
      })
      return { data: { sent: true }, error: null }
    }
    ```
  - [ ] Handle the recovery callback in `src/app/api/auth/callback/route.ts`: detect `?type=recovery`, exchange code for session, redirect to `/reset-password?step=update`
  - [ ] Add **State 3 (update)** to reset-password page: new password input + confirm, calls `supabase.auth.updateUser({ password: newPassword })`
  - [ ] Password validation: same rule as signup — minimum 8 characters (reuse `signupSchema.shape.password`)
  - [ ] Confirm password field: State 3 must include a "Confirm new password" input; validate `newPassword === confirmPassword` client-side before calling `updateUser`; show inline error "Passwords do not match" if they differ
  - [ ] Recovery session guard: on State 3 page load, call `supabase.auth.getUser()` to verify a valid recovery session exists; if not (user navigated directly or session expired), redirect back to State 1 (request form) with message "Your reset link has expired — please request a new one"
  - [ ] `updateUser` error handling: if Supabase returns an error (expired token, already used), show user-friendly message "Reset link expired — please request a new one" and redirect to State 1
  - [ ] Server-side validation: `requestPasswordReset` validates email format before calling Supabase; empty or invalid email returns error without calling Supabase (prevents unnecessary API calls and leaking request patterns)
  - [ ] Empty email guard: `requestPasswordReset(email)` must validate `email.trim().length > 0` and basic email format server-side, returning a validation error — the always-success response must still be returned for valid-format emails to prevent enumeration
  - [ ] Supabase sends the reset email via the custom SMTP (Resend) configured in Story 1.5 — no additional email code needed

- [ ] Task 7: E2E tests (Playwright)
  - [ ] Create `tests/e2e/login.spec.ts`
  - [ ] Test: valid credentials → redirect to `/decks`
  - [ ] Test: invalid credentials → generic "Invalid email or password" error
  - [ ] Test: error message does NOT contain "email" or "password" alone (no info leakage)
  - [ ] Test: Google OAuth button present and visible
  - [ ] Test: logged-in user visits login page → redirected to `/decks` (middleware)
  - [ ] Test: logout → session cleared → cannot access `/(app)/decks` → redirected to `/login`
  - [ ] Test: after logout, `/decks` route → redirect to `/login` (session invalidated)
  - [ ] Test: password reset link on login page works (no 404)
  - [ ] Test: submitting reset form shows confirmation message without revealing email existence
  - [ ] Test: navigating to `/reset-password?step=update` without a recovery session redirects to State 1
  - [ ] Test: mismatched passwords in State 3 shows inline "Passwords do not match" error
  - [ ] Test: empty email in reset form returns validation error (not silent success)
  - [ ] Run `axe-playwright` on login page (ARCH16)

## Dev Notes

### Login Server Action — Generic Error Message (CRITICAL)

```typescript
// src/app/(auth)/login/actions.ts
'use server'
import { createUserClient } from '@/lib/supabase/user'
import type { Result } from '@/types'

export async function signInWithEmail(
  email: string,
  password: string
): Promise<Result<{ redirectUrl: string }>> {
  const supabase = await createUserClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // NEVER reveal Supabase's raw error (can indicate whether email exists)
    return {
      data: null,
      error: { message: 'Invalid email or password', code: 'AUTH_INVALID_CREDENTIALS' },
    }
  }

  // Note: session cookie is set by @supabase/ssr via the createUserClient() cookie store
  // If the cookie fails to set (edge case: response already partially committed), the user
  // will be redirected to /decks but middleware will immediately redirect back to /login.
  // This is an acceptable degradation — not a security issue, just a UX hiccup that resolves on retry.
  return { data: { redirectUrl: '/decks' }, error: null }
}
```

**Security rule:** Supabase returns distinct errors for "user not found" vs "wrong password". Never expose these to the client — always return the same generic message. This prevents email enumeration attacks.

### Logout Server Action

```typescript
// src/app/(app)/actions.ts
'use server'
import { createUserClient } from '@/lib/supabase/user'
import { revalidatePath } from 'next/cache'
import type { Result } from '@/types'

export async function logout(): Promise<Result<void>> {
  const supabase = await createUserClient()
  const { error } = await supabase.auth.signOut()

  // Always clear cache and return — even if signOut errored (session may be gone already)
  // Never leave the user stuck on a "logging out" screen due to a network error
  revalidatePath('/', 'layout')

  if (error) {
    console.error('[logout] signOut error (non-fatal):', error.message)
    // Return error so client can log it, but client MUST still redirect to /
  }
  return { data: undefined, error: null } // always succeed from client's perspective
}
```

**How session invalidation works:**
- `supabase.auth.signOut()` invalidates the refresh token on Supabase's server
- `@supabase/ssr` clears the HTTP-only session cookie from the browser
- JWT TTL: typically ≤ 1 hour — after logout the JWT is blacklisted on Supabase side
- Client-side redirect to `/` happens after Server Action returns success
- Middleware re-check on next `/(app)/*` request → redirects to `/login`

### JWT Rotation — Automatic via Middleware (NFR-SEC3)

JWT rotation requires NO custom code in this story. The architecture implements it automatically:
1. `src/middleware.ts` calls `supabase.auth.getUser()` on every request (Story 1.2)
2. `@supabase/ssr` transparently refreshes expired JWTs using the refresh token
3. New JWT written back to HTTP-only cookie via `supabase.cookies.setAll()`

**This means:** NFR-SEC3 (short-lived JWTs with rotation) is already satisfied by Story 1.2's middleware. No additional implementation needed.

### Middleware Redirect with `redirectTo`

```typescript
// src/middleware.ts — update to preserve redirect destination
// (modify the /(app)/* redirect section)
if (!user && request.nextUrl.pathname.startsWith('/app')) {
  const redirectUrl = new URL('/login', request.url)
  redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
  return NextResponse.redirect(redirectUrl)
}
```

```typescript
// src/app/api/auth/callback/route.ts — honor redirectTo after login
const rawRedirect = searchParams.get('redirectTo') ?? '/decks'
// Block protocol-relative URLs (//evil.com) and backslash variants (/\@evil.com — browsers normalize \ to /)
const safeRedirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.startsWith('/\\') ? rawRedirect : '/decks'
return NextResponse.redirect(`${origin}${safeRedirect}`)
```

**Security note:** Always validate `redirectTo` starts with `/` and contains no `//` or `/\` prefix — both bypass patterns have been used in open redirect attacks.

### AppNav Logout Pattern (Client Component)

```typescript
// src/components/shared/AppNav.tsx — add logout
'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { logout } from '@/app/(app)/actions'

// Inside AppNav component:
const router = useRouter()
const [isLoggingOut, setIsLoggingOut] = useState(false)

const handleLogout = async () => {
  setIsLoggingOut(true)
  try {
    await logout()
    // refresh() before push() — clears RSC cache before navigation lands on /
    router.refresh()
    router.push('/')
  } catch {
    // Network/Server Action failure — still redirect to force re-auth
    router.push('/')
  } finally {
    setIsLoggingOut(false)
  }
}

// In JSX:
<button onClick={handleLogout} disabled={isLoggingOut}>
  {isLoggingOut ? 'Logging out...' : 'Log out'}
</button>
```

### File Structure for This Story

New files:
```
src/
  app/
    (auth)/
      login/
        page.tsx              ← NEW: login form (Client Component)
        actions.ts            ← NEW: signInWithEmail() Server Action
      reset-password/
        page.tsx              ← NEW: password reset page (request / confirmation / update states)
        actions.ts            ← NEW: requestPasswordReset() Server Action
    (app)/
      actions.ts              ← NEW (or UPDATE): logout() Server Action

Modified files:
  src/middleware.ts            ← MODIFY: add ?redirectTo param to login redirect
  src/app/api/auth/callback/route.ts  ← MODIFY: honor redirectTo param, validate it
  src/components/shared/AppNav.tsx    ← MODIFY: wire logout button

New test files:
  tests/e2e/login.spec.ts     ← NEW
```

### Architecture Compliance Checklist (Anti-Disaster)

- [ ] Login error message is ALWAYS "Invalid email or password" — never reveals email/password separately
- [ ] `supabase.auth.signOut()` called server-side (Server Action) — not client-side `supabase` instance
- [ ] JWT rotation handled by middleware's `getUser()` call — no custom rotation logic
- [ ] `redirectTo` param validated: must start with `/` and NOT start with `//` or `/\` (prevents protocol-relative and backslash open redirect bypasses)
- [ ] `revalidatePath('/', 'layout')` called after logout to clear server-side cache
- [ ] `router.refresh()` called after logout to clear client-side router cache
- [ ] Login page uses `createUserClient()` (anon key) — NOT service role
- [ ] Rate limiting already active from Story 1.2 middleware (`/api/auth/`) — no new limiting
- [ ] All Server Actions return `Result<T>` — never throw

### Previous Story Intelligence

Story 1.5 established:
- `src/app/api/auth/callback/route.ts` — extend with `redirectTo` support
- `signInWithGoogle()` action — reuse for Google login button
- `src/app/(auth)/layout.tsx` — login page uses same auth layout

Story 1.4 established:
- `src/components/shared/AppNav.tsx` — modify for logout button

Story 1.2 established:
- `src/middleware.ts` — session refresh + route protection already wired
- `createUserClient()` usage pattern — use in all auth operations
- Rate limiting active on `/api/auth/` path — 10 attempts / 15 min

### Story Definition of Done

A story is complete when ALL are true:
1. **E2E tests** — Playwright: login success → `/decks`; invalid creds → generic error; logout → session cleared
2. **Security** — Error message tested for non-disclosure (no email/password distinction)
3. **Logout** — `/(app)/decks` inaccessible after logout (redirected to `/login`)
4. **Redirect** — `redirectTo` param honored after login; open redirect prevented
5. **Accessibility** — `axe-playwright` passes on login page
6. **Result type** — All Server Actions return `Result<T>`

### References

- Auth middleware pattern: `_bmad-output/planning-artifacts/architecture.md` (Middleware & Admin Access)
- Session handling: architecture.md (Session Handling section)
- FR5 (login), FR6 (logout), NFR-SEC3 (JWT rotation), NFR-SEC7 (rate limiting)
- ARCH16: `axe-playwright` for accessibility
- Story 1.2: middleware + rate limiting foundation
- Story 1.5: auth callback route + Google OAuth pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
