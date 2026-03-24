# Story 2.2: Password Change

Status: done

## Story

As a registered user with an email/password account,
I want to change my password,
so that I can maintain account security.

## Acceptance Criteria

1. **Given** I am on the security settings page **When** I submit my correct current password and a new valid password (min 8 characters) **Then** my password is updated via Supabase Auth **And** all existing sessions except the current one are invalidated **And** I see a success confirmation

2. **Given** I submit an incorrect current password **When** I try to change my password **Then** an error is displayed and no change is made

3. **Given** I am a Google OAuth user without a password set **When** I visit the password change section **Then** the password form is not shown, replaced with a message explaining that my account uses Google sign-in

## Tasks / Subtasks

- [x] Task 1: Security settings page (AC: #1, #2, #3)
  - [x] Create `src/app/(app)/settings/security/page.tsx` — Server Component that fetches auth user and passes `isEmailProvider` flag and `userEmail` to `PasswordChangeForm`
  - [x] Detect provider: `const isEmailProvider = user.identities?.some(i => i.provider === 'email') ?? false`
  - [x] Render `<PasswordChangeForm isEmailProvider={isEmailProvider} />` — if `isEmailProvider` is false, form renders "uses Google sign-in" notice
  - [x] Auth guard is already handled by `(app)` layout — no additional redirect needed in page

- [x] Task 2: `changePassword` Server Action (AC: #1, #2)
  - [x] Create `src/app/(app)/settings/security/actions.ts`
  - [x] `changePassword(formData: FormData): Promise<Result<void>>`
    1. `getUser()` — get authenticated user; return `UNAUTHORIZED` if no user
    2. Extract `currentPassword`, `newPassword` from `formData`
    3. Server-side Zod validation: `newPasswordSchema.safeParse(newPassword)` — return `VALIDATION_ERROR` on fail
    4. Re-authenticate via `signInWithPassword({ email: user.email!, password: currentPassword })` — return `{ code: 'WRONG_PASSWORD', message: 'Current password is incorrect' }` on failure
    5. Call `supabase.auth.updateUser({ password: newPassword })` — return `AUTH_ERROR` on failure
    6. Return `{ data: undefined, error: null }` on success
  - [x] **No DAL function needed** — password change is purely Supabase Auth, does not touch Drizzle/DB

- [x] Task 3: Zod validation schema (AC: #1)
  - [x] Create `src/lib/validators/password.ts`
  - [x] `newPasswordSchema = z.string().min(8, { error: 'Password must be at least 8 characters' })`
  - [x] Export `validateNewPassword(value: unknown)` as a safeParse wrapper (same pattern as `validateDisplayNameInput` in `profile.ts`)

- [x] Task 4: `PasswordChangeForm` client component (AC: #1, #2, #3)
  - [x] Create `src/components/security/PasswordChangeForm.tsx`
  - [x] Use `useActionState` (React 19) — same pattern as `DisplayNameForm.tsx`
  - [x] Props: `{ isEmailProvider: boolean }`
  - [x] If `!isEmailProvider`: render `<p>Your account uses Google sign-in. Password change is not available.</p>` — no form
  - [x] Three fields: `currentPassword`, `newPassword`, `confirmPassword`
  - [x] Client-side: validate `newPassword` with `newPasswordSchema` and check `confirmPassword === newPassword` before calling Server Action
  - [x] Show inline error per field using `role="alert"` (WCAG — same pattern as `DisplayNameForm`)
  - [x] Show success `role="status"` message on completion
  - [x] Reset form on success via state.success renders static success message (no re-render of form)

- [x] Task 5: Tests (AC: #1, #2, #3)
  - [x] Create `src/lib/validators/password.test.ts` — unit tests for `newPasswordSchema`: min length, edge cases (7 chars fail, 8 pass, empty fail)
  - [x] Create `tests/integration/password-change.test.ts` — test Server Action with mocked Supabase (no real DB needed: pure Auth flow)
    - Test: `getUser()` fails → returns `UNAUTHORIZED`
    - Test: Zod validation fails (< 8 chars) → returns `VALIDATION_ERROR` before calling `signInWithPassword`
    - Test: `signInWithPassword` fails → returns `WRONG_PASSWORD`
    - Test: `updateUser` fails → returns `AUTH_ERROR`
    - Follow mock pattern from `tests/integration/anonymous-upgrade.test.ts`

## Dev Notes

### Architecture Compliance

- **Result<T>:** All Server Actions return `Result<T>` from `@/types`. Success void = `{ data: undefined, error: null }`. Never `{ data: null, error: null }`.
- **Auth pattern:** Always use `supabase.auth.getUser()` server-side — never trust client-provided userId (prevents privilege escalation).
- **No DAL:** Password change uses only Supabase Auth APIs (`signInWithPassword`, `updateUser`). No Drizzle, no `src/server/db/queries/` changes.
- **`(app)` route group auth guard:** `src/app/(app)/layout.tsx` already redirects unauthenticated users to `/login`. No redundant guard needed in the security page.

### Provider Detection — OAuth vs Email/Password

```typescript
// In security/page.tsx (Server Component)
const supabase = await createUserClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')

const isEmailProvider = user.identities?.some(i => i.provider === 'email') ?? false
```

`user.identities` is an array of identity objects. A Google-only user has one entry with `provider: 'google'`. An email/password user has one entry with `provider: 'email'`. A user who linked both has two entries. Only show the password form if `isEmailProvider` is true.

### Current Password Verification

Supabase `updateUser({ password })` does NOT require current password — it just updates. To enforce the AC requirement to verify current password, re-authenticate first:

```typescript
// In Server Action
const { error: reAuthError } = await supabase.auth.signInWithPassword({
  email: user.email!,
  password: currentPassword,
})
if (reAuthError) {
  return { data: null, error: { message: 'Current password is incorrect', code: 'WRONG_PASSWORD' } }
}

// Only if re-auth succeeded:
const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
```

**Important:** `signInWithPassword` refreshes the session cookie as a side effect. This is fine — the user stays logged in and the next `updateUser` call operates on the fresh session.

### Session Invalidation Behavior

Per architecture (Session Handling section): `supabase.auth.updateUser({ password })` triggers Supabase GoTrue to invalidate all refresh tokens for the user. **All other active sessions are forcibly logged out at their next token refresh** (within JWT TTL, typically ≤1 hour). This is Supabase's built-in behavior — **no custom session revocation code required** for this story. The current session remains active.

### Zod v4 Syntax

This project uses Zod v4. Error messages use `{ error: '...' }` not `{ message: '...' }`:

```typescript
// ✅ Correct (Zod v4)
z.string().min(8, { error: 'Password must be at least 8 characters' })

// ❌ Wrong (Zod v3)
z.string().min(8, { message: 'Password must be at least 8 characters' })
```

See existing validators in `src/lib/validators/profile.ts` for reference.

### `useActionState` Form Pattern

Follow `DisplayNameForm.tsx` exactly:

```typescript
'use client'
import { useActionState } from 'react'  // React 19 — NOT 'react-dom'

type State = { error: string | null; success: boolean }
const [state, formAction, pending] = useActionState(action, { error: null, success: false })
```

Client-side validation runs inside the `action` function before calling the Server Action, preventing unnecessary round-trips.

### File Structure

**New files:**
- `src/app/(app)/settings/security/page.tsx` — Server Component (security settings page)
- `src/app/(app)/settings/security/actions.ts` — `changePassword` Server Action
- `src/components/security/PasswordChangeForm.tsx` — Client component
- `src/lib/validators/password.ts` — `newPasswordSchema` + `validateNewPassword()`
- `src/lib/validators/password.test.ts` — unit tests
- `tests/integration/password-change.test.ts` — integration tests

**No modified files** — this story is additive only.

### Security Settings Page Design (Cross-Story Awareness)

Story 2.3 (Active Session View & Revocation) **also lives on the security settings page** (`/settings/security`). Design `page.tsx` with a section-based layout so Story 2.3 can add a "Sessions" section below without restructuring:

```tsx
<main className="mx-auto max-w-lg px-4 py-10">
  <h1 className="mb-8 text-2xl font-semibold">Security Settings</h1>
  <section aria-labelledby="password-heading" className="...">
    <h2 id="password-heading" className="mb-4 text-base font-medium">Change password</h2>
    <PasswordChangeForm isEmailProvider={isEmailProvider} />
  </section>
  {/* Story 2.3 will add a Sessions section here */}
</main>
```

### Testing Pattern (from `tests/integration/anonymous-upgrade.test.ts`)

Integration tests mock the Supabase client. The mock structure for this story:

```typescript
// Mock pattern: control what getUser/signInWithPassword/updateUser return
vi.mock('@/lib/supabase/user', () => ({
  createUserClient: vi.fn(),
}))

// Test: wrong password
mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid credentials' } })
```

No real DB or Supabase connection needed — all password operations are Auth-layer only.

### No New Env Vars

All required env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are already set from Epic 1. No new configuration required.

### Previous Story Learnings (from Story 2.1)

- **`(auth)` route group layout** at `src/app/(auth)/layout.tsx` already exists. **`(app)` layout** at `src/app/(app)/layout.tsx` already exists with auth guard — do not recreate.
- **`createUserClient()`** is imported from `@/lib/supabase/user` (not `@/lib/supabase/server` or similar).
- **Zod v4 per-field errors:** access via `parsed.error.issues[0]?.message`, not `.errors[0]?.message`.
- **shadcn/ui components:** Use `Label`, `Input`, `Button` from `@/components/ui/*` — already installed. Do NOT use `Form`/`FormField` pattern unless needed (simple forms like `DisplayNameForm` use plain HTML `<form>` + shadcn primitives).
- **`revalidatePath`**: Not needed for password change (no DB data changes, no cached server content affected).
- **`Result<void>` void success:** Return `{ data: undefined, error: null }` — not `{ data: null, error: null }`.

### References

- Architecture: Session Handling + Session Revocation vs Password Change section [Source: `_bmad-output/planning-artifacts/architecture.md`]
- FR12: Password change requirement [Source: `_bmad-output/planning-artifacts/epics.md`]
- Epic 2 Story 2.2 acceptance criteria [Source: `_bmad-output/planning-artifacts/epics.md`]
- Supabase `updateUser` API: `supabase.auth.updateUser({ password: newPassword })` [Source: Context7 /supabase/supabase — passwords.mdx]
- Previous story patterns [Source: `_bmad-output/implementation-artifacts/2-1-profile-information-update.md`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Implementation Notes

Implemented all 5 tasks. Key decisions:
- Password change is purely Supabase Auth — no Drizzle/DAL changes required.
- Current password verification uses `signInWithPassword` re-authentication before calling `updateUser`. This refreshes the session cookie as a side effect, which is acceptable since `updateUser` immediately follows.
- `PasswordChangeForm` uses per-field error state (`fieldError` object) rather than a single error string, surfacing current password errors inline to the relevant field for better UX.
- On success the form replaces itself with a static confirmation message rather than resetting fields — prevents accidental re-submission and gives clear feedback.
- Security settings page includes a placeholder comment for Story 2.3's sessions section — page structure ready to extend without restructuring.
- `confirm password` validation runs entirely client-side; server never receives it (FormData still includes it but action ignores it).

### Debug Log

- `user.identities` is typed as optional on Supabase User type — used `?.some()` with `?? false` fallback to handle undefined safely.
- Integration tests placed in `tests/integration/` despite not requiring a real DB — they test the full Server Action wiring with mocked Supabase, matching the signup actions test pattern in `src/app/(auth)/signup/actions.test.ts`.
- Confirmed `useActionState` import is from `'react'` not `'react-dom'` (React 19 pattern, consistent with `DisplayNameForm.tsx`).

### Completion Notes List

- 📌 Deferred: Manual E2E verification of password change flow — needs `/decks` placeholder page before app is fully navigable
- 📌 Deferred: Manual verification of Google OAuth "uses Google sign-in" message — needs real OAuth user in dev Supabase
- All automated tests pass (128). Manual items deferred until app navigation is complete.

### File List

**New:**
- `src/app/(app)/settings/security/page.tsx`
- `src/app/(app)/settings/security/actions.ts`
- `src/components/security/PasswordChangeForm.tsx`
- `src/lib/validators/password.ts`
- `src/lib/validators/password.test.ts`
- `tests/integration/password-change.test.ts`

**Modified:**
- `_bmad-output/implementation-artifacts/2-2-password-change.md` — story status and task tracking
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story status updated

## Change Log

- **feat:** Added `src/lib/validators/password.ts` — `newPasswordSchema` (min 8 chars, Zod v4) + `validateNewPassword()` wrapper
- **feat:** Added `src/app/(app)/settings/security/actions.ts` — `changePassword` Server Action with getUser auth guard, Zod validation, re-authentication via `signInWithPassword`, and `updateUser` password change; `user.email` null guard prevents anonymous user misuse
- **feat:** Added `src/components/security/PasswordChangeForm.tsx` — client form with `useActionState`, per-field error state, client-side confirm-password match check, `minLength={8}` on new password input, OAuth-user fallback message
- **feat:** Added `src/app/(app)/settings/security/page.tsx` — security settings Server Component; detects email provider via `user.identities`; structured with section headings ready for Story 2.3 sessions section
- **test:** Added `src/lib/validators/password.test.ts` — 8 unit tests for `newPasswordSchema` and `validateNewPassword`
- **test:** Added `tests/integration/password-change.test.ts` — 13 tests covering all Server Action branches (UNAUTHORIZED incl. null email, VALIDATION_ERROR, WRONG_PASSWORD, AUTH_ERROR, success)
