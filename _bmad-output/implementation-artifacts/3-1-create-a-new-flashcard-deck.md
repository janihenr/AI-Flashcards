# Story 3-1: Create a New Flashcard Deck

**Status:** review
**Epic:** Epic 3 — Deck & Card Library

## Story

As an authenticated user,
I want to create a new flashcard deck with a title and subject,
So that I can start building a collection of cards for a specific learning topic.

## Acceptance Criteria

1. **Given** I am on my personal library page **When** I click "Create deck" **Then** a form appears with fields: Title (required, max 100 chars) and Subject (optional)

2. **Given** I submit a valid title **When** the deck is created **Then** the new deck record is inserted via the DAL with my `userId` **And** I am redirected to the deck detail page at `/decks/{deckId}` **And** a `deck_created` analytics event is fired with `deckId`

3. **Given** I submit without a title **When** I try to create **Then** a validation error is shown before any server call is made **And** no deck is created

4. **Given** I submit a title exceeding 100 characters **When** I try to create **Then** a validation error is shown **And** no deck is created

5. **Given** I am an unauthenticated user **When** I navigate to `/decks/new` **Then** I am redirected to `/login` by middleware

## Tasks / Subtasks

- [x] Task 1: DAL function `createDeck()` (AC: #2)
  - [x] Add `createDeck(userId, data)` to `src/server/db/queries/decks.ts`
  - [x] Returns `Result<{ id: string }>` using `.returning({ id: decks.id })`
  - [x] Input shape: `{ title: string; subject?: string | null }`
  - [x] **No migration needed** — `decks` table already exists from `0000_confused_grandmaster.sql`

- [x] Task 2: Validator (AC: #3, #4)
  - [x] Create `src/lib/validators/deck.ts`
  - [x] `createDeckSchema`: title (required, trim, min 1, max 100), subject (optional, trim, max 100)
  - [x] Export `validateCreateDeckInput(value)` returning Zod SafeParseResult
  - [x] Use Zod v4 `{ error: '...' }` syntax — matches project convention (see profile.ts)

- [x] Task 3: Server Action `createNewDeck` (AC: #1, #2, #3, #4, #5)
  - [x] Create `src/app/(app)/decks/actions.ts`
  - [x] `createNewDeck(_prev, formData)` — `getUser()` → validate → `createDeck` DAL → `trackEvent('deck_created', { deckId })` → `redirect('/decks/' + deckId)`
  - [x] Returns `Result<void>` on error; `redirect()` (throws NEXT_REDIRECT, never returns) on success
  - [x] Normalize empty subject string from form: `formData.get('subject') || undefined`

- [x] Task 4: `CreateDeckForm` client component (AC: #1, #3, #4)
  - [x] Create `src/components/decks/CreateDeckForm.tsx`
  - [x] `useActionState(createNewDeck, null)` for server-round-trip error display
  - [x] HTML5 `required` and `maxLength={100}` for instant browser-level validation
  - [x] Display `state?.error?.message` as `role="alert"` paragraph
  - [x] Submit button disabled when `isPending`

- [x] Task 5: New deck page (AC: #1, #5)
  - [x] Create `src/app/(app)/decks/new/page.tsx` — Server Component
  - [x] Auth guard: `if (!user) return null` (layout handles redirect)
  - [x] Renders `<CreateDeckForm />`

- [x] Task 6: Deck detail stub page (AC: #2)
  - [x] Create `src/app/(app)/decks/[deckId]/page.tsx` — Server Component
  - [x] Auth guard + ownership check: `if (!user || deck.userId !== user.id) notFound()`
  - [x] Renders deck title, optional subject, empty-state message ("No cards yet. Add cards to start studying.")
  - [x] Minimal stub — full card listing comes in stories 3-2+
  - [x] `params` is `Promise<{ deckId: string }>` in Next.js 15 — must be awaited

- [x] Task 7: "Create deck" entry point on library page (AC: #1)
  - [x] Update `src/app/(app)/decks/page.tsx` to add a `<Link href="/decks/new">Create deck</Link>` button

- [x] Task 8: Tests (AC: #2, #3, #4)
  - [x] Create `src/lib/validators/deck.test.ts` — unit tests for `createDeckSchema` (15 tests, all passing)
  - [x] Create `tests/integration/create-deck.test.ts` — mocked Server Action integration tests (14 tests, all passing)
  - [x] Full suite: all existing tests still pass (256 tests passing)

## Dev Notes

### Architecture Requirements

- **No migration needed**: `decks` table already exists in `supabase/migrations/0000_confused_grandmaster.sql`. Do NOT create a new migration for this story.
- **DAL pattern**: Add `createDeck` to `src/server/db/queries/decks.ts`. Server Actions call DAL functions — never raw Drizzle in actions.
- **Result<T> pattern**: DAL functions and Server Actions return `Result<T>` from `@/types`. Never throw across these boundaries.
- **Authentication**: Always call `supabase.auth.getUser()` in Server Actions — never trust client-provided `userId`. Derive `userId` server-side only.
- **Analytics tracking (FR58)**: Call `trackEvent('deck_created', { deckId })` from `@/lib/analytics` after a successful insert. This is fire-and-forget (`void`) — non-blocking, non-transactional. A tracking failure must never block the redirect.
- **Redirect on success**: Use `redirect()` from `next/navigation` inside the Server Action. It throws `NEXT_REDIRECT` internally — Next.js intercepts it. Do NOT wrap in try/catch.
- **`(app)` route group**: Middleware at `src/middleware.ts` already redirects unauthenticated `/decks/new` requests to `/login`. The RSC pages add a secondary `if (!user) return null` guard — this is the established pattern (see `profile/page.tsx` and `security/page.tsx`).

### Key Files

#### New Files
| Path | Purpose |
|------|---------|
| `src/lib/validators/deck.ts` | Zod schema and validation helper |
| `src/lib/validators/deck.test.ts` | Unit tests for validator |
| `src/components/decks/CreateDeckForm.tsx` | Client form component |
| `src/app/(app)/decks/new/page.tsx` | New deck RSC page |
| `src/app/(app)/decks/[deckId]/page.tsx` | Deck detail stub RSC |
| `src/app/(app)/decks/actions.ts` | Server Actions |
| `tests/integration/create-deck.test.ts` | Mocked integration tests |

#### Modified Files
| Path | Change |
|------|--------|
| `src/server/db/queries/decks.ts` | Add `createDeck` function |
| `src/app/(app)/decks/page.tsx` | Add "Create deck" link |

### Code Patterns

#### Validator (`src/lib/validators/deck.ts`)

```typescript
import { z } from 'zod'

export const createDeckSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: 'Title is required' })
    .max(100, { error: 'Title must be 100 characters or fewer' }),
  subject: z
    .string()
    .trim()
    .max(100, { error: 'Subject must be 100 characters or fewer' })
    .optional(),
})

export type CreateDeckInput = z.infer<typeof createDeckSchema>

export function validateCreateDeckInput(
  value: unknown
): ReturnType<typeof createDeckSchema.safeParse> {
  return createDeckSchema.safeParse(value)
}
```

**Critical**: Use `{ error: '...' }` (Zod v4 syntax) — NOT `{ message: '...' }`. See `src/lib/validators/profile.ts` for the established project convention.

#### DAL Function (add to `src/server/db/queries/decks.ts`)

```typescript
export async function createDeck(
  userId: string,
  data: { title: string; subject?: string | null }
): Promise<Result<{ id: string }>> {
  try {
    const [row] = await db
      .insert(decks)
      .values({
        userId,
        title: data.title,
        subject: data.subject ?? null,
      })
      .returning({ id: decks.id })

    if (!row) return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
    return { data: { id: row.id }, error: null }
  } catch (err) {
    console.error('[createDeck] DB error:', err)
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
```

The existing imports at the top of `decks.ts` (`db`, `decks`, `Result`) already cover everything needed — no new imports required.

#### Server Action (`src/app/(app)/decks/actions.ts`)

```typescript
'use server'

import { redirect } from 'next/navigation'
import { createUserClient } from '@/lib/supabase/user'
import { createDeck } from '@/server/db/queries/decks'
import { validateCreateDeckInput } from '@/lib/validators/deck'
import { trackEvent } from '@/lib/analytics'
import type { Result } from '@/types'

export async function createNewDeck(formData: FormData): Promise<Result<void>> {
  const supabase = await createUserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
  }

  const raw = {
    title: formData.get('title'),
    // Normalize empty string → undefined so optional subject passes Zod validation
    subject: formData.get('subject') || undefined,
  }

  const parsed = validateCreateDeckInput(raw)
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: parsed.error.issues[0]?.message ?? 'Invalid input',
        code: 'VALIDATION_ERROR',
      },
    }
  }

  const result = await createDeck(user.id, parsed.data)
  if (result.error) return result

  // FR58: fire-and-forget analytics — never block on tracking failure
  trackEvent('deck_created', { deckId: result.data.id })

  // redirect() throws NEXT_REDIRECT — Next.js handles it; do not catch
  redirect(`/decks/${result.data.id}`)
}
```

#### RSC Page — New Deck (`src/app/(app)/decks/new/page.tsx`)

```typescript
import { createUserClient } from '@/lib/supabase/user'
import { CreateDeckForm } from '@/components/decks/CreateDeckForm'

export const metadata = { title: 'Create Deck' }

export default async function NewDeckPage() {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  // (app) layout guarantees user is authenticated — null path is unreachable
  if (!user) return null

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold">Create a new deck</h1>
      <CreateDeckForm />
    </main>
  )
}
```

#### RSC Page — Deck Detail Stub (`src/app/(app)/decks/[deckId]/page.tsx`)

```typescript
import { notFound } from 'next/navigation'
import { createUserClient } from '@/lib/supabase/user'
import { getDeckById } from '@/server/db/queries/decks'

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  // Next.js 15: params is a Promise — must be awaited
  const { deckId } = await params

  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const result = await getDeckById(deckId)
  if (result.error || !result.data) notFound()

  const deck = result.data

  // Ownership check: only the deck owner can view (shared access added in story 3-6)
  if (deck.userId !== user.id) notFound()

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{deck.title}</h1>
      {deck.subject && (
        <p className="mt-1 text-sm text-muted-foreground">{deck.subject}</p>
      )}
      <p className="mt-8 text-sm text-muted-foreground">
        No cards yet. Add cards to start studying.
      </p>
    </main>
  )
}
```

#### Client Form Component (`src/components/decks/CreateDeckForm.tsx`)

```typescript
'use client'

import { useActionState } from 'react'
import { createNewDeck } from '@/app/(app)/decks/actions'
import type { Result } from '@/types'

export function CreateDeckForm() {
  const [state, formAction, isPending] = useActionState<Result<void> | null, FormData>(
    createNewDeck,
    null
  )

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium">
          Title <span aria-hidden="true">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={100}
          placeholder="e.g. Spanish Vocabulary"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-required="true"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="subject" className="text-sm font-medium">
          Subject <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          maxLength={100}
          placeholder="e.g. Language Learning"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Creating…' : 'Create deck'}
      </button>
    </form>
  )
}
```

**Note**: Use `action={formAction}` (not `onSubmit`) so the form degrades gracefully and works with Next.js progressive enhancement. HTML5 `required` and `maxLength={100}` provide browser-level validation before the action is called. The `useActionState` hook manages the pending state.

#### Library Page Update (`src/app/(app)/decks/page.tsx`)

```typescript
import Link from 'next/link'

export default function DecksPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Decks</h1>
        <Link
          href="/decks/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create deck
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Your flashcard decks will appear here.</p>
    </main>
  )
}
```

**Note**: Full deck listing with `findDecksByUserId` will be added in story 3-5.

### Tests

#### Unit Tests (`src/lib/validators/deck.test.ts`)

Follow the pattern from `src/lib/validators/profile.test.ts`.

Cover at minimum:
- Valid title + subject → parses successfully with trimmed values
- Valid title, no subject → parses successfully
- Empty title → error "Title is required"
- Title of exactly 100 chars → valid (boundary)
- Title of 101 chars → error "Title must be 100 characters or fewer"
- Title with leading/trailing whitespace → trimmed to valid value
- Subject of exactly 100 chars → valid (boundary)
- Subject of 101 chars → error "Subject must be 100 characters or fewer"
- Subject `undefined` → parses as `undefined` (optional works correctly)
- Subject empty string — behavior depends on whether normalized upstream (document test intent)

#### Integration Tests (`tests/integration/create-deck.test.ts`)

Use mocked Supabase clients and mocked DAL — same structure as `tests/integration/session-revocation.test.ts`. No real DB needed for these tests.

Required mocks at top of file (before imports):
```typescript
vi.mock('@/lib/supabase/user', () => ({ createUserClient: vi.fn() }))
vi.mock('@/server/db/queries/decks', () => ({ createDeck: vi.fn() }))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
```

Cover:
- UNAUTHORIZED when `getUser()` returns no user
- UNAUTHORIZED when `getUser()` returns an auth error
- VALIDATION_ERROR when title is empty string
- VALIDATION_ERROR when title is `null` (missing form field)
- VALIDATION_ERROR when title exceeds 100 chars
- `createDeck` is NOT called when validation fails
- `createDeck` is called with correct `userId`, `title`, and `subject` on valid input
- `trackEvent('deck_created', { deckId: '...' })` is called on success
- `redirect('/decks/deck-id-123')` is called on success
- DB_ERROR from `createDeck` is returned as-is (no tracking, no redirect)
- `trackEvent` is NOT called when `createDeck` returns an error

#### DB Integration Test (optional, skipIf no `DATABASE_URL`)

Using the pattern from `tests/integration/profile-update.test.ts`:
- Insert a minimal profile row, call `createDeck` DAL directly, verify the row exists in DB, clean up.
- Use `makeTestId()` helper pattern to generate deterministic test UUIDs.

### Zod v4 Error Syntax Reference

This project uses Zod v4. Custom error messages use `{ error: '...' }` — NOT `{ message: '...' }`:

```typescript
// CORRECT (Zod v4 — project convention)
z.string().min(1, { error: 'Title is required' })
z.string().max(100, { error: 'Title must be 100 characters or fewer' })

// WRONG (Zod v3 — do NOT use)
z.string().min(1, { message: 'Title is required' })
```

Canonical reference: `src/lib/validators/profile.ts` lines 5–7.

### `decks` Table Schema (already migrated)

```typescript
// src/server/db/schema/decks.ts (already exists — do not modify)
export const decks = pgTable('decks', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title:      text('title').notNull(),
  subject:    text('subject'),
  shareToken: text('share_token').unique(),
  deletedAt:  timestamp('deleted_at', { withTimezone: true }),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_decks_user_deleted').on(t.userId, t.deletedAt),
])
```

### Existing DAL Functions in `decks.ts` (do not modify)

The following already exist and must not be changed:
- `findDecksByUserId(userId, pagination)` — paginated list with soft-delete filter and cursor pagination
- `getSystemDeck()` — cached cold-start system deck
- `getDeckById(deckId)` — deck by ID with soft-delete check (used by the stub detail page)

Only `createDeck` is new.

### `trackEvent` Function

```typescript
// src/lib/analytics.ts
import { track } from '@vercel/analytics'

export function trackEvent(name: AppEvent, properties: Record<string, unknown>) {
  void track(name, properties as Record<string, string | number | boolean | null | undefined>)
}
```

`deck_created` is already declared in the `AppEvent` union type. No changes to `analytics.ts` needed.

## Dev Agent Record

**Completed:** 2026-03-24
**Agent:** claude-sonnet-4-6

### Implementation Notes

- `createNewDeck` Server Action accepts `(_prev, formData)` — the `_prev` first parameter is required for `useActionState` compatibility even though the story template showed `createNewDeck(formData)`.
- Empty subject string from FormData is normalized to `undefined` before validation (`formData.get('subject') || undefined`), so Zod's `.optional()` handles it cleanly.
- `trackEvent` is called with `void` (fire-and-forget) before `redirect()`. Since `redirect()` throws `NEXT_REDIRECT`, it must not be inside a try/catch block.
- Deck detail page at `[deckId]/page.tsx` uses `params: Promise<{ deckId: string }>` awaited — Next.js 15 pattern.

### Debug Log

No blocking issues encountered during implementation.

### Files Created / Modified

| File | Action |
|------|--------|
| `src/server/db/queries/decks.ts` | Modified — added `createDeck()` DAL function |
| `src/lib/validators/deck.ts` | Created — Zod schema + `validateCreateDeckInput` |
| `src/app/(app)/decks/actions.ts` | Created — `createNewDeck` Server Action |
| `src/components/decks/CreateDeckForm.tsx` | Created — client form with `useActionState` |
| `src/app/(app)/decks/new/page.tsx` | Created — RSC page rendering form |
| `src/app/(app)/decks/[deckId]/page.tsx` | Created — deck detail stub RSC |
| `src/app/(app)/decks/page.tsx` | Modified — added "Create deck" link |
| `src/lib/validators/deck.test.ts` | Created — 15 unit tests, all passing |
| `tests/integration/create-deck.test.ts` | Created — 14 integration tests, all passing |

### Test Results

- Unit tests (`deck.test.ts`): 15/15 passing
- Integration tests (`create-deck.test.ts`): 14/14 passing
- Full suite: 256/256 passing
- TypeScript: no errors (`pnpm tsc --noEmit` clean)
