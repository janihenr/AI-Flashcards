# Story 2.6: Account Deletion Request

Status: done

## Story

As a registered user,
I want to request deletion of my account and all associated personal data,
So that I can exercise my GDPR right to erasure.

## Acceptance Criteria

1. **Given** I am on the privacy settings page **When** I click "Delete account" **Then** a confirmation form is shown explaining exactly what will be deleted

2. **Given** I type "DELETE" to confirm and submit **When** the request is processed **Then** the following steps execute atomically (all succeed or all roll back):
   - my profile is soft-deleted immediately (`profiles.deleted_at` set)
   - `profiles.user_fsrs_params`, `profiles.format_preferences`, and `profiles.previous_tier` are cleared (set to null) immediately
   - my decks and notes are soft-deleted (`deleted_at` set)
   - my FSRS reviews are hard-deleted immediately
   - I am signed out of all active sessions immediately
   - a deletion confirmation email is sent immediately
   - I am redirected away from the app
   - I cannot log back in (blocked at login/auth callback)

3. **Given** I try to log back in after account deletion **When** authentication succeeds **Then** the system detects the deleted profile and immediately signs me out, redirecting to a "your account has been deleted" message

4. **Given** the deletion step "type DELETE to confirm" **When** the button is disabled **Then** the confirm button remains disabled unless the input exactly matches "DELETE" (case-sensitive)

## Tasks / Subtasks

### Task 1: Deletion confirmation email template (AC: #2)

- [x] Create `src/server/email/templates/AccountDeletionEmail.tsx`:
  - Props: `{ userName: string | null }`
  - Subject (used at call-site): `"Your Flashcards account has been deleted"`
  - Body: Confirms account deletion, states data erasure will complete within 30 days, states payment data managed by Stripe is not affected
  - Pattern: follow `DataExportAckEmail.tsx` — React Email component with `@react-email/components`

### Task 2: `deleteAccount()` Server Action (AC: #2)

- [x] Add to `src/app/(app)/settings/privacy/actions.ts`:

  ```typescript
  'use server'

  import { eq, isNull } from 'drizzle-orm'
  import { createUserClient } from '@/lib/supabase/user'
  import { createServerAdminClient } from '@/lib/supabase/server'
  import { db } from '@/server/db'
  import { profiles, decks, notes } from '@/server/db/schema'
  // notes is co-located in decks.ts — re-exported from @/server/db/schema
  import { reviews } from '@/server/db/schema'
  import { sendEmail } from '@/server/email'
  import { AccountDeletionEmail } from '@/server/email/templates/AccountDeletionEmail'
  import { log } from '@/lib/logger'
  import type { Result } from '@/types'

  export async function deleteAccount(): Promise<Result<void>> {
    const userClient = await createUserClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
    }

    const userId = user.id
    const now = new Date()

    // Atomic DB transaction: soft-delete profile/decks/notes, clear sensitive fields, hard-delete reviews
    try {
      await db.transaction(async (tx) => {
        // 1. Soft-delete decks and notes
        await tx.update(decks)
          .set({ deletedAt: now })
          .where(eq(decks.userId, userId))

        await tx.update(notes)
          .set({ deletedAt: now })
          .where(eq(notes.userId, userId))

        // 2. Hard-delete reviews (GDPR erasure — no soft-delete on reviews)
        await tx.delete(reviews).where(eq(reviews.userId, userId))

        // 3. Soft-delete profile + clear sensitive Learning Fingerprint fields
        await tx.update(profiles)
          .set({
            deletedAt: now,
            userFsrsParams: null,
            formatPreferences: null,
            previousTier: null,
          })
          .where(eq(profiles.id, userId))
      })
    } catch (err) {
      log({ action: 'gdpr.delete.transaction_failed', userId, error: String(err) })
      return { data: null, error: { message: 'Account deletion failed. Please try again.', code: 'DELETION_FAILED' } }
    }

    // 4. Invalidate ALL sessions for this user (outside transaction — cannot roll back auth ops)
    const adminClient = createServerAdminClient()
    await adminClient.auth.admin.signOut(userId, { scope: 'global' })

    // 5. Send deletion confirmation email (non-fatal if it fails)
    const displayName = user.user_metadata?.display_name ?? null
    const { error: emailError } = await sendEmail(
      AccountDeletionEmail({ userName: displayName }),
      user.email!,
      'Your Flashcards account has been deleted'
    )
    if (emailError) {
      log({ action: 'gdpr.delete.email_failed', userId, error: emailError })
    }

    return { data: undefined, error: null }
  }
  ```

  Also add `DELETION_FAILED` to `src/types/errors.ts`:
  ```typescript
  DELETION_FAILED: 'DELETION_FAILED',
  ```

### Task 3: Block re-login for deleted accounts (AC: #3)

- [x] Read `src/app/api/auth/callback/route.ts` — add a deleted-account check after session exchange:

  After the `supabase.auth.exchangeCodeForSession()` call succeeds, query the profile:
  ```typescript
  import { db } from '@/server/db'
  import { profiles } from '@/server/db/schema'
  import { eq, isNotNull } from 'drizzle-orm'

  const [profile] = await db
    .select({ deletedAt: profiles.deletedAt })
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1)

  if (profile?.deletedAt !== null) {
    // Sign out immediately and redirect to deleted notice
    await supabase.auth.signOut({ scope: 'local' })
    return NextResponse.redirect(new URL('/account-deleted', request.url))
  }
  ```

- [x] Read `src/app/(auth)/login/actions.ts` — add the same deleted-account check after successful `signInWithPassword()`:

  After successful sign-in, check profile.deletedAt before returning success:
  ```typescript
  const [profile] = await db
    .select({ deletedAt: profiles.deletedAt })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)

  if (profile?.deletedAt !== null) {
    await supabase.auth.signOut({ scope: 'local' })
    return { data: null, error: { message: 'This account has been deleted.', code: 'ACCOUNT_DELETED' } }
  }
  ```

  Add `ACCOUNT_DELETED: 'ACCOUNT_DELETED'` to `src/types/errors.ts`.

- [x] Create `src/app/(auth)/account-deleted/page.tsx`:
  ```tsx
  export default function AccountDeletedPage() {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-sm text-center flex flex-col gap-4">
          <h1 className="text-xl font-semibold">Account deleted</h1>
          <p className="text-sm text-muted-foreground">
            This account has been deleted. Your personal data will be fully erased within 30 days.
          </p>
          <a href="/" className="text-sm underline">Return to home</a>
        </div>
      </main>
    )
  }
  ```

### Task 4: `DeleteAccountSection` client component (AC: #1, #4)

- [x] Create `src/components/privacy/DeleteAccountSection.tsx` (Client Component):

  ```typescript
  'use client'

  import { useState, useTransition } from 'react'
  import { useRouter } from 'next/navigation'
  import { Button } from '@/components/ui/button'
  import { deleteAccount } from '@/app/(app)/settings/privacy/actions'

  export function DeleteAccountSection() {
    const [showConfirm, setShowConfirm] = useState(false)
    const [confirmText, setConfirmText] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    function handleDelete() {
      setError(null)
      startTransition(async () => {
        const result = await deleteAccount()
        if (result.error) {
          setError(result.error.message)
          return
        }
        // Redirect to home — session is now invalidated server-side
        router.push('/')
      })
    }

    if (!showConfirm) {
      return (
        <Button
          variant="destructive"
          onClick={() => setShowConfirm(true)}
        >
          Delete account
        </Button>
      )
    }

    return (
      <div className="flex flex-col gap-4 rounded-md border border-destructive p-4">
        <p className="text-sm font-medium text-destructive">
          This will permanently delete your account. The following data will be removed:
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-4 flex flex-col gap-1">
          <li>Your profile and account information</li>
          <li>All decks, notes, and cards</li>
          <li>Your full study history (reviews)</li>
          <li>Your Learning Fingerprint preferences</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Payment data is managed by Stripe and is not affected. Full data erasure completes within 30 days.
        </p>
        <div className="flex flex-col gap-2">
          <label htmlFor="delete-confirm" className="text-sm font-medium">
            Type <span className="font-mono font-bold">DELETE</span> to confirm
          </label>
          <input
            id="delete-confirm"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-full"
            placeholder="DELETE"
            autoComplete="off"
            aria-describedby={error ? 'delete-error' : undefined}
          />
        </div>
        {error && (
          <p id="delete-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="destructive"
            disabled={confirmText !== 'DELETE' || isPending}
            onClick={handleDelete}
          >
            {isPending ? 'Deleting…' : 'Confirm deletion'}
          </Button>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => { setShowConfirm(false); setConfirmText(''); setError(null) }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }
  ```

### Task 5: Add deletion section to privacy page (AC: #1)

- [x] Modify `src/app/(app)/settings/privacy/page.tsx` — import and add the third section:

  ```tsx
  import { DeleteAccountSection } from '@/components/privacy/DeleteAccountSection'

  // Add after the summary section (Story 2.5) inside <main>:
  <section aria-labelledby="delete-heading" className="flex flex-col gap-4">
    <h2 id="delete-heading" className="text-base font-medium text-destructive">
      Delete Account
    </h2>
    <p className="text-sm text-muted-foreground">
      Permanently delete your account and all associated personal data. This action cannot be undone.
    </p>
    <DeleteAccountSection />
  </section>
  ```

### Task 6: Tests (AC: #1, #2, #3, #4)

- [x] Create `tests/integration/account-deletion.test.ts`:

  Key test cases for `deleteAccount()`:
  - `getUser()` fails → returns `{ data: null, error: { code: 'UNAUTHORIZED' } }`
  - Transaction succeeds → all four DB operations called (update decks, update notes, delete reviews, update profiles)
  - Transaction throws → returns `{ data: null, error: { code: 'DELETION_FAILED' } }` and `log()` called
  - `adminClient.auth.admin.signOut` called with `(userId, { scope: 'global' })`
  - `sendEmail()` called with correct `to` and subject after successful transaction
  - Email failure (non-fatal): transaction still reported success
  - Returns `{ data: undefined, error: null }` on full success

  Mock pattern:
  ```typescript
  vi.mock('@/lib/supabase/user', () => ({ createUserClient: vi.fn() }))
  vi.mock('@/lib/supabase/server', () => ({ createServerAdminClient: vi.fn() }))
  vi.mock('@/server/email', () => ({ sendEmail: vi.fn() }))
  vi.mock('@/lib/logger', () => ({ log: vi.fn() }))
  vi.mock('@/server/db', () => ({ db: mockDb }))
  ```

  Drizzle transaction mock:
  ```typescript
  const mockDb = {
    transaction: vi.fn().mockImplementation(async (fn) => {
      // tx has same shape as db for update/delete
      return fn({
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockReturnThis(),
      })
    }),
  }
  ```

  Admin client mock:
  ```typescript
  const mockAdminSignOut = vi.fn().mockResolvedValue({ error: null })
  const mockAdminClient = {
    auth: { admin: { signOut: mockAdminSignOut } },
  }
  vi.mocked(createServerAdminClient).mockReturnValue(mockAdminClient as any)
  ```

## Dev Notes

### Architecture Compliance

- **Result<T>:** All Server Actions return `Result<T>`. New error codes `DELETION_FAILED` and `ACCOUNT_DELETED` added to `src/types/errors.ts`.
- **Auth pattern:** Always `getUser()` via user client. Never trust client-provided userId.
- **`(app)` layout:** Already has auth guard. The deletion redirects the user to `/` (outside `(app)`) after invalidating sessions.
- **No Route Handlers for mutations.** `deleteAccount()` is a Server Action.
- **Structured logging:** `log()` called on transaction failure and email failure (FR54).
- **Drizzle transaction scope:** Only covers Postgres operations. Supabase Auth admin calls (`signOut`) happen AFTER the transaction commits — they cannot be rolled back. This is acceptable: if the transaction succeeds but signOut fails, the user's sessions eventually expire via JWT TTL.

### Drizzle Transaction — Verified API (Context7)

```typescript
import { db } from '@/server/db'

await db.transaction(async (tx) => {
  await tx.update(table).set({ col: val }).where(condition)
  await tx.delete(table).where(condition)
  // All operations roll back automatically if any throws
})
```

The `tx` object has the same query API as `db`. No special imports needed beyond `db` and the schema tables.

### CRITICAL: `notes` Table Location

`notes` is defined in `src/server/db/schema/decks.ts`. **Import `notes` from `@/server/db/schema` — NEVER from `./notes` or `@/server/db/schema/notes` (these don't exist).**

### Supabase Admin Sign Out — Verified (Context7)

```typescript
// Invalidates ALL refresh tokens for the user across all devices/sessions
await adminClient.auth.admin.signOut(userId, { scope: 'global' })
```

This immediately invalidates all refresh tokens. Active JWTs remain valid until their TTL expires (~1 hour), but the user cannot refresh them. Combined with the server-side redirect after `deleteAccount()` returns success, the user is effectively signed out immediately.

### Blocking Re-Login for Deleted Accounts

Two entry points where deleted accounts must be blocked:

1. **OAuth callback** (`/api/auth/callback/route.ts`): After `exchangeCodeForSession()` — query profile.deletedAt; if set, `signOut({ scope: 'local' })` + redirect to `/account-deleted`

2. **Email/password login** (login Server Action): After `signInWithPassword()` succeeds — query profile.deletedAt; if set, `signOut({ scope: 'local' })` + return `ACCOUNT_DELETED` error to show on login form

Read both files before implementing to understand their exact structure.

### Privacy Page Structure (Post-2.5)

The privacy page after Stories 2.4 and 2.5 has two sections:
```tsx
<main className="max-w-xl mx-auto p-4 flex flex-col gap-8">
  <h1>Privacy Settings</h1>
  <section aria-labelledby="export-heading">   {/* Story 2.4 */}
    <DataExportSection ... />
  </section>
  <section aria-labelledby="summary-heading">  {/* Story 2.5 */}
    <DataSummarySection ... />
  </section>
  {/* Story 2.6 appends here: */}
  <section aria-labelledby="delete-heading">
    <DeleteAccountSection />
  </section>
</main>
```

Note: Story 2.5 (`DataSummarySection`) may not be implemented yet (status: `ready-for-dev`). If the summary section is absent when implementing this story, append the delete section after the export section. Do NOT add a stub for the summary section.

### `shadcn/ui` Dialog Not Available

`src/components/ui/dialog.tsx` does NOT exist in this project. The confirmation UI is implemented as an inline toggle form (CSS state-driven), not a modal dialog. This is intentional — do NOT attempt to install shadcn/ui Dialog.

### File Structure

**New files:**
- `src/server/email/templates/AccountDeletionEmail.tsx`
- `src/components/privacy/DeleteAccountSection.tsx`
- `src/app/(auth)/account-deleted/page.tsx`
- `tests/integration/account-deletion.test.ts`

**Modified files:**
- `src/app/(app)/settings/privacy/actions.ts` — add `deleteAccount()` action
- `src/app/(app)/settings/privacy/page.tsx` — add delete section
- `src/app/api/auth/callback/route.ts` — add deleted-account check
- `src/app/(auth)/login/actions.ts` (or equivalent) — add deleted-account check
- `src/types/errors.ts` — add `DELETION_FAILED`, `ACCOUNT_DELETED`

### Database Operations in the Transaction

| Operation | Table | Filter | Type |
|---|---|---|---|
| Soft-delete decks | `decks` | `userId = userId` | UPDATE `deleted_at = now` |
| Soft-delete notes | `notes` | `userId = userId` | UPDATE `deleted_at = now` |
| Hard-delete reviews | `reviews` | `userId = userId` | DELETE |
| Soft-delete + clear profile | `profiles` | `id = userId` | UPDATE `deleted_at`, clear 3 fields |

Cards are NOT deleted in this story's immediate phase — they are excluded from queries via `isNull(decks.deletedAt)` in normal use; hard erasure within the 30-day background window (Story 9.x or cron).

`ai_usage` rows are NOT deleted immediately — same 30-day window.

### Previous Story Learnings (from Stories 2.1–2.5)

- **`createUserClient()`** from `@/lib/supabase/user`; **`createServerAdminClient()`** from `@/lib/supabase/server`
- **Section pattern:** `<section aria-labelledby="X-heading">` with `<h2 id="X-heading">` — WCAG landmark
- **`useTransition` over `useActionState`:** For stateless/single-trigger actions (same as `SessionList`, `DataExportSection`)
- **Inline error with `role="alert"`:** WCAG pattern — shown on action failure
- **`notes` import:** From `@/server/db/schema` NOT `./notes`
- **Admin client:** `createServerAdminClient()` from `@/lib/supabase/server` — service role, server-only
- **Email template pattern:** `DataExportAckEmail.tsx` — React Email with `@react-email/components`; `sendEmail(ReactElement, to, subject)` wrapper
- **No route redirect from Server Actions:** The Client Component handles redirect via `router.push('/')` after action returns success
- **`router.push` after deletion:** Use `useRouter()` from `'next/navigation'` in the Client Component

### Cross-Story Awareness

- **Story 9.x (Observability):** `log()` calls in `deleteAccount()` feed into the structured error log (FR54).
- **Anonymous sessions cron:** Does NOT interact with this story — anonymous sessions have `linked_at IS NULL` and are purged separately after 30 days.
- **No new migrations:** No new DB columns or tables. Soft-delete columns already exist on profiles/decks/notes. Hard-delete on reviews uses existing table.

### References

- Epic 2 Story 2.6 acceptance criteria [Source: `_bmad-output/planning-artifacts/epics.md#Story-2.6`]
- Architecture: Soft-delete pattern [Source: `_bmad-output/planning-artifacts/architecture.md`]
- Architecture: Hard-delete on GDPR erasure [Source: `_bmad-output/planning-artifacts/architecture.md`]
- Story 2.4 privacy page structure and action patterns [Source: `_bmad-output/implementation-artifacts/2-4-gdpr-personal-data-export.md`]
- Context7: Drizzle ORM `db.transaction(async (tx) => {...})` — atomic rollback
- Context7: Supabase `auth.admin.signOut(userId, { scope: 'global' })` — all-session invalidation

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Implementation Notes

All 6 tasks completed. Transaction covers soft-delete of profiles/decks/notes and hard-delete of reviews atomically. Session invalidation via `adminClient.auth.admin.signOut(userId, { scope: 'global' })` runs after transaction commit. Deleted-account guard added to both `auth/callback/route.ts` (OAuth) and `login/actions.ts` (email/password).

`dialog.tsx` is not installed — used inline toggle form pattern for the confirmation UI instead of a modal.

The `ACCOUNT_DELETED` error message in `signInWithEmail` intentionally reveals account deletion status to the user (GDPR transparency requirement, not an enumeration vector since credentials must already be valid).

### Debug Log

- Cycle 1: `adminClient.auth.admin.signOut()` return value was unhandled — added error logging (non-fatal).
- Cycle 2: `signInWithEmail` deleted-account guard lacked test coverage — added `tests/integration/login-deleted-account.test.ts`.
- `errors.test.ts` count assertion updated from 7 → 9 for the two new error codes.

### File List

**New files:**
- `src/server/email/templates/AccountDeletionEmail.tsx`
- `src/components/privacy/DeleteAccountSection.tsx`
- `src/app/(auth)/account-deleted/page.tsx`
- `tests/integration/account-deletion.test.ts`
- `tests/integration/login-deleted-account.test.ts`

**Modified files:**
- `src/app/(app)/settings/privacy/actions.ts` — added `deleteAccount()`, added imports
- `src/app/(app)/settings/privacy/page.tsx` — added `<DeleteAccountSection>` section
- `src/app/api/auth/callback/route.ts` — added deleted-account check after `exchangeCodeForSession`
- `src/app/(auth)/login/actions.ts` — added deleted-account check after `signInWithPassword`
- `src/types/errors.ts` — added `DELETION_FAILED`, `ACCOUNT_DELETED`
- `src/types/errors.test.ts` — updated error code count, added tests for new codes

### Change Log

- Implemented GDPR right to erasure (Story 2.6)
- Added `deleteAccount()` Server Action with Drizzle transaction for atomic DB deletion
- Added re-login guard to both OAuth callback and email/password login paths
- Added `account-deleted` page for blocked re-login flow
- Added 2 new error codes: `DELETION_FAILED`, `ACCOUNT_DELETED`
- 15 new unit/integration tests (227 total passing)
