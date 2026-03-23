# Story 1.5: User Registration — Google OAuth & Email/Password

Status: review

## Story

As a new user,
I want to sign up using Google OAuth or email/password,
So that I can create a permanent account and access the full product.

## Acceptance Criteria

1. **Given** I am on the signup page **When** the form is displayed **Then** a Terms of Service acceptance checkbox is shown, including explicit age confirmation: "I confirm I am 13 or older and agree to the Terms of Service" **And** the signup submit button is disabled until the checkbox is checked

2. **Given** I am on the signup page and click "Sign up with Google" **When** I complete Google OAuth consent **Then** I am redirected back to the app and signed in **And** a `profiles` record is created with `tier = 'free'`

3. **Given** I choose email/password signup and submit a valid email and password (min 8 characters) **When** the form is submitted **Then** a verification email is sent via Resend within 60 seconds (NFR-INT4) **And** upon email verification, I am redirected to my personal library

4. **Given** I submit a password with fewer than 8 characters **When** I try to submit **Then** a validation error is shown client-side before any server call is made

5. **Given** an IP makes more than 10 auth attempts within 15 minutes (NFR-SEC7) **When** the 11th attempt is made **Then** a 429 rate-limited response is returned via Vercel KV + Upstash rate limiter (FR62)

## Tasks / Subtasks

- [x] Task 1: Install Resend and React Email (AC: #3)
  - [x] `pnpm add resend @react-email/components`
  - [x] Verify installed as regular dependencies

- [x] Task 2: Configure Supabase + Resend integration (AC: #3)
  - [ ] **Dashboard — SMTP:** Supabase Dashboard → Project Settings → Auth → SMTP Settings → enable custom SMTP
  - [ ] Set SMTP host: `smtp.resend.com`, port: `465`, user: `resend`, password: `{RESEND_API_KEY}`
  - [ ] Set sender email to `noreply@{your-verified-domain}`
  - [x] This routes ALL Supabase Auth emails (verification, password reset) through Resend — no custom code needed
  - [x] **IMPORTANT:** Do NOT send a manual verification email from `signUpWithEmail` — Supabase handles it via the custom SMTP config above. Sending a second email would cause duplicates.
  - [ ] **Dashboard — Redirect Allow List:** Supabase Dashboard → Auth → URL Configuration → Add `${NEXT_PUBLIC_APP_URL}/api/auth/callback` to Redirect Allow List — required for both OAuth and email redirects to work; without this Supabase returns a 400 error
  - [x] **Code:** `src/server/email/index.ts` overwritten with canonical `sendEmail()` wrapper — for non-auth transactional emails only
  - [ ] **Env vars:** Add `RESEND_API_KEY=re_...` to `.env.local` (already documented in `.env.example` — do NOT add a duplicate entry to `.env.example`)
  - [ ] Add note to `README.md` or `docs/`: "Supabase custom SMTP must be configured in the dashboard with Resend before email verification works in production"

- [ ] Task 3: Enable Google OAuth in Supabase Dashboard (AC: #2) — **manual step, required before code works**
  - [ ] Supabase Dashboard → Auth → Providers → Google → enable
  - [ ] Paste Google OAuth Client ID and Client Secret (from Google Cloud Console → APIs & Credentials → OAuth 2.0 Client)
  - [ ] In Google Cloud Console: add `{SUPABASE_PROJECT_URL}/auth/v1/callback` as an authorized redirect URI
  - [ ] Verify `NEXT_PUBLIC_APP_URL` is set in `.env.local` — used as the OAuth redirectTo base
  <!-- DEV NOTE: This task requires manual Dashboard configuration by Jani. All code is ready. -->

- [x] Task 4: Create auth callback route (AC: #2, #3)
  - [x] Create `src/app/api/auth/callback/route.ts` — handles Supabase OAuth + email verification redirect
  - [x] Use `exchangeCodeForSession(code)` — see canonical code in Dev Notes
  - [x] **Production redirect:** Use `x-forwarded-host` in non-dev environments to construct the redirect URL (see canonical code in Dev Notes — Vercel's load balancer changes `origin`)
  - [x] On success: honor `redirectTo` query param (validated — must start with `/` and not `//`), default `/decks`
  - [x] On error (no code, or exchange fails): redirect to `/login?error=auth_failed`
  - [x] Guard: if `data.user` is null after successful `exchangeCodeForSession`, treat as error and redirect to `/login?error=auth_failed`
  - [x] Handle `?type=recovery`: detect recovery flow, redirect to `/reset-password?step=update`
  - [x] Check `tos_accepted` cookie (set by OAuth pre-consent step): if present, set `gdprConsentAt` in upsertProfile; if absent, set `gdprConsentAt: null` and redirect to `/terms?required=true` before proceeding
  - [x] Fresh signup only (no `anon_upgrade_id` cookie): call `upsertProfile` — wrap in try/catch (non-fatal; log and proceed to `/decks`)
  - [x] NEVER use `getSession()` — callback uses `exchangeCodeForSession` only; `getUser()` in middleware

- [x] Task 5: Create signup page (AC: #1, #2, #3, #4)
  - [x] Create `src/app/(auth)/layout.tsx` if not exists — auth layout (no persistent nav)
  - [x] Create `src/app/(auth)/signup/page.tsx` (Client Component — form requires interactivity)
  - [x] Use shadcn/ui `Form`, `Input`, `Button`, `Checkbox` components (already added via `npx shadcn@latest add` in Story 1.4)
  - [x] Form fields: email, password (min 8 chars)
  - [x] ToS checkbox: "I confirm I am 13 or older and agree to the Terms of Service" — links to `/terms`
  - [x] Submit button disabled until ToS checkbox checked
  - [x] Client-side Zod validation (inline, before server call): email format, password min 8 chars
  - [x] **Google OAuth button flow:** user must check ToS checkbox first → button enabled → on click: set `tos_accepted=true` cookie (httpOnly: false, maxAge: 300, sameSite: lax) → call `signInWithGoogle()` Server Action → on success: `window.location.href = data.url` (NOT `router.push` — must leave Next.js routing context for OAuth)
  - [x] Form submit (email/password): calls `signUpWithEmail` Server Action
  - [x] Error display below each field using React Hook Form + Zod
  - [x] Loading state on submit button

- [x] Task 6: Create signup Server Actions (AC: #2, #3, #5)
  - [x] Create `src/app/(auth)/signup/actions.ts`
  - [x] `signUpWithEmail(email, password, tosAccepted)`: validates `tosAccepted === true` server-side (GDPR/legal — cannot be bypassed via direct API calls), then validates email/password with `signupEmailSchema`, then calls `supabase.auth.signUp()`
  - [x] `signInWithGoogle()`: returns `Result<{ url: string }>` — client must redirect to `data.url` via `window.location.href`; calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '...' } })` server-side and reads `data.url` from the response
  - [x] All actions return `Result<T>` — never throw (see canonical patterns in Dev Notes)
  - [x] Rate limiting is already wired in `src/middleware.ts` for `/api/auth/` — no duplicate limiting here

- [x] Task 7: Create `profiles` upsert DAL function (AC: #2)
  - [x] Add `upsertProfile(userId: string, data: Partial<ProfileInsert>)` to `src/server/db/queries/users.ts`
  - [x] Called from auth callback route after OAuth or email verification
  - [x] Uses Drizzle `onConflictDoUpdate` with `gdprConsentAt` intentionally omitted from the SET clause (INSERT sets it on first signup; UPDATE must NOT overwrite an existing consent timestamp — GDPR Article 7)
  - [x] Creates profile with `tier = 'free'`, `gdprConsentAt = now()`, `isAdmin = false`

- [x] Task 8: Client-side Zod validation schema (AC: #4)
  - [x] Create `src/lib/validators/auth.ts` (file currently contains only a `.gitkeep` placeholder — create fresh)
  - [x] `signupSchema`: email (valid format), password (min 8 chars), tosAccepted (must be `true`)
  - [x] Export `signupEmailSchema = signupSchema.omit({ tosAccepted: true })` — used in Server Action for email/password validation (separate from manual `tosAccepted` check)
  - [x] Import and reuse in signup form

- [x] Task 9: E2E tests (Playwright)
  - [x] Create `tests/e2e/signup.spec.ts`
  - [x] Test: signup form renders with ToS checkbox
  - [x] Test: submit button disabled until ToS checked
  - [x] Test: Google OAuth button disabled until ToS checked
  - [x] Test: password < 8 chars → client-side error, no server call
  - [x] Test: Google OAuth button present and enabled after ToS checked
  - [x] Test: successful email signup → success/check-email message shown
  - [x] Run `axe-playwright` on signup page (ARCH16)
  - [x] **Note:** Full Google OAuth flow (actual Google sign-in) cannot be automated in CI — test only that the button triggers the flow (network intercept or that `window.location.href` is set). Manual verification required for the OAuth round-trip.

## Dev Notes

### New Packages This Story

```bash
pnpm add resend @react-email/components
```

### Canonical Resend Email Wrapper

```typescript
// src/server/email/index.ts
import { Resend } from 'resend'
import type { ReactElement } from 'react'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(
  template: ReactElement,
  to: string,
  subject: string
): Promise<{ error: string | null }> {
  const { error } = await resend.emails.send({
    from: 'noreply@flashcards.app',  // update domain after Resend domain verification
    to,
    subject,
    react: template,
  })
  return { error: error?.message ?? null }
}
```

**Rules (non-negotiable):**
- No inline HTML strings anywhere — all email templates are React Email components
- `from` address requires verified domain in Resend dashboard
- `RESEND_API_KEY` loaded from env — never hardcoded

### Canonical Auth Callback Route

```typescript
// src/app/api/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createUserClient } from '@/lib/supabase/user'
import { upsertProfile } from '@/server/db/queries/users'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (!code) return NextResponse.redirect(`${origin}/login?error=auth_failed`)

  const supabase = await createUserClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Password recovery flow — redirect to password update form
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/reset-password?step=update`)
  }

  // Read anon upgrade cookie (set by Server Action before OAuth redirect, per Story 1.6)
  // httpOnly cookie — NOT a query param (query params are logged in access logs / referrers)
  const anonId = (await cookies()).get('anon_upgrade_id')?.value
  if (!anonId) {
    // Fresh signup only — do not call upsertProfile during anonymous upgrade (Story 1.6 handles it)
    // Check tos_accepted cookie set by OAuth pre-consent step (see OAuth GDPR section below)
    const tosAccepted = (await cookies()).get('tos_accepted')?.value === 'true'
    try {
      await upsertProfile(data.user.id, {
        tier: 'free',
        gdprConsentAt: tosAccepted ? new Date() : null,
      })
    } catch (err) {
      // Non-fatal: log but proceed — profile can be lazily created on first app load
      console.error('[auth/callback] upsertProfile failed:', err)
    }
    // If ToS was not accepted, redirect to terms page before entering the app
    if (!tosAccepted) {
      return buildRedirect(origin, request, '/terms?required=true')
    }
  }

  // Honor post-login redirect (validated below)
  const rawRedirect = searchParams.get('redirectTo') ?? '/decks'
  // Block protocol-relative URLs (//evil.com), backslash variants (/\@evil.com browsers treat \ as /), and external URLs
  const safeRedirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.startsWith('/\\') ? rawRedirect : '/decks'

  return buildRedirect(origin, request, safeRedirect)
}

// Use x-forwarded-host in production to avoid Vercel load-balancer URL as origin
function buildRedirect(origin: string, request: Request, path: string): NextResponse {
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.redirect(`${origin}${path}`)
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${path}`)
  }
  return NextResponse.redirect(`${origin}${path}`)
}
```

### Signup Server Action Pattern

```typescript
// src/app/(auth)/signup/actions.ts
'use server'
import { createUserClient } from '@/lib/supabase/user'
import type { Result } from '@/types'
import { signupEmailSchema } from '@/lib/validators/auth'

export async function signUpWithEmail(
  email: string,
  password: string,
  tosAccepted: boolean
): Promise<Result<{ message: string }>> {
  // Server-side validation — client-side is bypassable via direct API calls
  // Validate tosAccepted explicitly: ToS acceptance is a legal/GDPR requirement; cannot be bypassed
  if (!tosAccepted) {
    return { data: null, error: { message: 'You must accept the Terms of Service to continue', code: 'TOS_NOT_ACCEPTED' } }
  }
  // signupEmailSchema = signupSchema.omit({ tosAccepted: true }) — validates email + password only
  const parsed = signupEmailSchema.safeParse({ email, password })
  if (!parsed.success) {
    return { data: null, error: { message: parsed.error.errors[0]?.message ?? 'Invalid input', code: 'VALIDATION_ERROR' } }
  }

  const supabase = await createUserClient()
  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })
  if (error) return { data: null, error: { message: error.message } }
  // Supabase silently succeeds for already-registered emails (returns no error, sends no email)
  // Detect this: identities array is empty for duplicate signups
  if (signUpData.user?.identities?.length === 0) {
    return { data: { message: 'Check your email to verify your account' }, error: null }
    // Return same message to avoid revealing whether email is registered (enumeration protection)
  }
  return { data: { message: 'Check your email to verify your account' }, error: null }
}

export async function signInWithGoogle(): Promise<Result<{ url: string }>> {
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return { data: null, error: { message: 'App URL not configured', code: 'CONFIG_ERROR' } }
  }
  const supabase = await createUserClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })
  if (error) return { data: null, error: { message: error.message } }
  if (!data.url) return { data: null, error: { message: 'OAuth redirect URL missing', code: 'AUTH_ERROR' } }
  return { data: { url: data.url }, error: null }
}
```

### Zod Validation Schema

```typescript
// src/lib/validators/auth.ts
import { z } from 'zod'

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tosAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms of Service to continue' }),
  }),
})

// Used in Server Action: validates email + password only (tosAccepted checked separately via if-guard)
export const signupEmailSchema = signupSchema.omit({ tosAccepted: true })

export type SignupInput = z.infer<typeof signupSchema>
```

### `gdprConsentAt` — Set on Signup

```typescript
// In upsertProfile() — called from auth callback
await db.insert(profiles).values({
  id: userId,
  tier: 'free',
  isAdmin: false,
  gdprConsentAt: new Date(),  // user explicitly accepted ToS on signup
}).onConflictDoUpdate({
  target: profiles.id,
  // Only update non-consent fields on conflict — never overwrite gdprConsentAt once set
  set: {
    tier: 'free',
    // gdprConsentAt intentionally omitted: INSERT sets it on first signup; UPDATE preserves existing
  },
})
```

**Why:** The ToS checkbox ("I confirm I am 13 or older and agree to the Terms of Service") constitutes explicit GDPR consent. `gdprConsentAt` is therefore set at first signup. It is NOT set in the cookie consent banner (Story 1.3) — that tracks analytics consent, not ToS/data processing consent.

**OAuth consent gap:** For Google OAuth, the user is redirected away before the ToS checkbox can be submitted. To thread explicit consent through OAuth:
- Add a pre-OAuth consent step: before calling `signInWithGoogle()`, require the user to check the ToS checkbox; store `tosAccepted: true` in a short-lived cookie (httpOnly: false, maxAge: 300)
- In the auth callback: check for the `tos_accepted` cookie; if present, set `gdprConsentAt`; if absent, set `gdprConsentAt` to null and redirect to a "Please accept our terms" page before proceeding
- This ensures `gdprConsentAt` is only set when the user has demonstrably accepted the ToS (GDPR Article 7)

**Anonymous upgrade guard:** When `anon_upgrade_id` cookie is present (Story 1.6 upgrade path), do NOT call `upsertProfile`. The full pattern is in the canonical callback route above.

### Rate Limiting — Already Wired

Auth rate limiting (10 attempts / 15 min per IP) is already configured in `src/middleware.ts` from Story 1.2 for the `/api/auth/` path prefix. The signup Server Actions do NOT add additional rate limiting — middleware handles it. AC #5 is already satisfied by Story 1.2's infrastructure.

### File Structure for This Story

New files:
```
src/
  app/
    (auth)/
      layout.tsx                      ← NEW (if not exists): auth layout (no nav)
      signup/
        page.tsx                      ← NEW: signup form (Client Component)
        actions.ts                    ← NEW: signUpWithEmail, signInWithGoogle
    api/
      auth/
        callback/
          route.ts                    ← NEW: OAuth + email verification callback
  server/
    email/
      index.ts                        ← OVERWRITE placeholder: implement sendEmail() wrapper
  lib/
    validators/
      auth.ts                         ← NEW: signupSchema + signupEmailSchema Zod validators

Modified files:
  src/server/db/queries/users.ts      ← MODIFY: add upsertProfile()
  .env.local                          ← MODIFY: add RESEND_API_KEY (do NOT touch .env.example — already documented there)
```

### Architecture Compliance Checklist (Anti-Disaster)

- [ ] Server Action `signUpWithEmail` returns `Result<T>` — never throws
- [ ] `upsertProfile` uses Drizzle `onConflictDoUpdate` — safe to call multiple times
- [ ] `gdprConsentAt` set in INSERT; intentionally omitted from `onConflictDoUpdate` SET clause — never overwritten once set (GDPR Article 7)
- [ ] Google OAuth redirect URL uses `NEXT_PUBLIC_APP_URL` env var — not hardcoded
- [ ] Auth callback uses `createUserClient()` (anon key + cookies) — NOT `createServerAdminClient()`
- [ ] Auth callback + Server Actions use `getUser()` — NEVER `getSession()` (`getSession()` reads unverified local storage data and must not be trusted server-side)
- [ ] Auth callback uses `x-forwarded-host` in production to construct redirect URL — NOT raw `origin` (Vercel load balancer changes `origin`)
- [ ] `${NEXT_PUBLIC_APP_URL}/api/auth/callback` registered in Supabase Dashboard → Auth → URL Configuration → Redirect Allow List
- [ ] Email templates are React Email components — no inline HTML strings anywhere
- [ ] `Resend` client instantiated at module level in `src/server/email/index.ts` — NOT per-request (avoids re-creating the client on every call)
- [ ] Zod validation runs client-side (before Server Action) AND server-side (in action)
- [ ] `tosAccepted: true` validated server-side in `signUpWithEmail` — cannot be bypassed by calling the action directly (legal/GDPR requirement)
- [ ] Google OAuth pre-consent: `tos_accepted` cookie set before OAuth redirect; checked in callback to set `gdprConsentAt` — ensures GDPR Article 7 compliance for OAuth path
- [ ] `profiles.tier = 'free'` on new signup — hardcoded default, not user-settable
- [ ] Rate limiting: AC #5 satisfied by Story 1.2 middleware — no duplicate middleware needed
- [ ] `RESEND_API_KEY` in `.env.local` — already in `.env.example`, do NOT add a duplicate entry

### Previous Story Intelligence

Story 1.4 established:
- `npx shadcn@latest init` completed — use shadcn `Form`, `Input`, `Button`, `Checkbox` here
- `src/stores/study-session.ts` pattern for Zustand stores
- `createUserClient()` usage pattern from Supabase client files

Story 1.2 established:
- `src/middleware.ts` — auth rate limiting on `/api/auth/` already active
- `src/lib/rate-limit.ts` — `authLimiter` pre-configured (10 attempts / 15 min)
- `Result<T>` from `@/types` — use for all Server Action returns
- `src/lib/constants.ts` — import constants from here, never redefine

### Auth Callback Route — Integration Contract

`src/app/api/auth/callback/route.ts` is modified by Stories 1.5, 1.6, 1.7, and 1.8. The final combined logic (after all 4 stories) evaluates query params in this order:

1. `code` absent → redirect to `/login?error=auth_failed`
2. `type=recovery` → exchange code, redirect to `/reset-password?step=update` (Story 1.8)
3. `invite_token` present → accept team invite after session exchange (Story 1.7)
4. `anon_upgrade_id` cookie present (httpOnly, set by Server Action) → run anonymous upgrade after session exchange (Story 1.6)
5. Default → upsertProfile with `tier='free'` + honor `redirectTo` (Story 1.5)

When implementing Story 1.5's callback, build the structure to accommodate all future branches — even if only the default case is live. This prevents four separate "modify callback" steps from conflicting.

### Story Definition of Done

A story is complete when ALL are true:
1. **E2E tests** — Playwright: signup flow works for email/password path
2. **ToS gate** — Submit disabled until checkbox checked (verified in E2E)
3. **Client validation** — Password < 8 chars blocked before server call (E2E verified)
4. **Email** — Verification email sends via Resend (integration test or manual verify)
5. **Profile** — `profiles` row created with `tier = 'free'` + `gdprConsentAt` set
6. **Rate limiting** — Already active from Story 1.2 — no new work required
7. **Result type** — All Server Actions return `Result<T>`

### References

- Auth routes: `_bmad-output/planning-artifacts/architecture.md` (`src/app/(auth)/`)
- Resend email pattern: architecture.md (`src/server/email/index.ts`)
- RBAC tier management: architecture.md (`profiles.tier`)
- FR3 (signup), FR5 (Google login), FR62 (rate limiting)
- NFR-INT4 (verification email within 60s), NFR-SEC7 (brute-force protection)
- Story 1.2: rate limiting infrastructure
- Story 1.4: shadcn/ui initialized — use components here

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Installed `resend@6.9.4` and `@react-email/components@1.0.10` as production dependencies
- **Zod v4 note:** Used `z.email()` top-level API (not deprecated `z.string().email()`) and `{ error: '...' }` parameter (not `{ message: '...' }`) per v4 breaking changes
- `src/server/email/index.ts` — overwrote placeholder with canonical `sendEmail()` wrapper; `Resend` client instantiated at module level
- `src/app/api/auth/callback/route.ts` — full OAuth + email verification callback with `buildRedirect()` helper for `x-forwarded-host` production handling; integration contract stubs for Stories 1.6, 1.7, 1.8 added as comments
- `src/app/(auth)/layout.tsx` — minimal auth layout (no nav); `src/app/(auth)/signup/page.tsx` — Client Component with React Hook Form + Zod, ToS-gated submit + Google OAuth buttons, GDPR `tos_accepted` cookie set before OAuth redirect
- `src/app/(auth)/signup/actions.ts` — `signUpWithEmail` (ToS guard → Zod validation → Supabase signUp, enumeration-safe response) and `signInWithGoogle` (returns URL for `window.location.href`)
- `src/server/db/queries/users.ts` — `upsertProfile` added; `gdprConsentAt` intentionally omitted from `onConflictDoUpdate` SET clause (GDPR Article 7)
- `src/lib/validators/auth.ts` — `signupSchema` + `signupEmailSchema` (Zod v4 API)
- **Task 3 (Dashboard config) and Dashboard steps in Task 2 are manual** — require Jani to configure in Supabase Dashboard and Google Cloud Console before email verification and Google OAuth will work
- 24 new unit tests added (validators: 10, Server Actions: 14); all 67 tests pass, 0 regressions; TypeScript: 0 errors

### File List

New files:
- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/signup/page.tsx`
- `src/app/(auth)/signup/actions.ts`
- `src/app/(auth)/signup/actions.test.ts`
- `src/app/api/auth/callback/route.ts`
- `src/lib/validators/auth.ts`
- `src/lib/validators/auth.test.ts`
- `tests/e2e/signup.spec.ts`

Modified files:
- `src/server/email/index.ts` — overwritten placeholder with sendEmail() wrapper
- `src/server/db/queries/users.ts` — added upsertProfile()
- `package.json` — added resend, @react-email/components
- `pnpm-lock.yaml`

