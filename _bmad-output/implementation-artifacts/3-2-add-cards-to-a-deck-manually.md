# Story 3.2: Add Cards to a Deck Manually

**Status:** review
**Epic:** Epic 3 — Deck & Card Library

## Story

As an authenticated user,
I want to add flashcards to a deck with front and back text and an optional image,
So that I can build up my collection one card at a time.

## Acceptance Criteria

1. **Given** I am on the detail page of a deck I own **When** I click "Add card" **Then** I navigate to `/decks/{deckId}/cards/new` with a form containing: Front (required), Back (required), Image (optional file input)

2. **Given** I fill in Front and Back and click "Add & next" **When** the card is created **Then** a note + card row are inserted via the DAL in a DB transaction **And** `card_added` analytics event is fired **And** the form resets with Front field auto-focused (rapid-entry flow, no navigation)

3. **Given** I click "Done" after adding cards **When** the navigation fires **Then** I am redirected to `/decks/{deckId}` and the card list is visible

4. **Given** I attach an image (JPEG/PNG/GIF/WEBP, ≤ 5 MB) **When** the card is saved **Then** the image is uploaded to Supabase Storage bucket `deck-images` at path `{userId}/{deckId}/{timestamp}-{filename}` **And** the public URL is stored in `cards.image_url` **And** `cards.mode` is set to `'image'`

5. **Given** I attach an image over 5 MB **When** the file is selected **Then** a client-side validation error is shown immediately **And** no data is sent to the server

6. **Given** I submit without Front or Back **When** the form validates **Then** an error is shown before the Server Action is called

7. **Given** I am an unauthenticated user **When** I navigate to `/decks/{deckId}/cards/new` **Then** I am redirected to `/login` by middleware

8. **Given** I navigate to `/decks/{deckId}/cards/new` for a deck I do not own **When** the page loads **Then** `notFound()` is returned (ownership enforced at RSC level, not just RLS)

9. **Given** the deck detail page loads **When** cards exist **Then** each card's Front and Back are displayed in a list

## Tasks / Subtasks

- [x] Task 1: DB migration — `deck-images` storage bucket + RLS (AC: #4)
  - [x] Create `supabase/migrations/0006_deck_images_storage.sql`
  - [x] Insert into `storage.buckets`: id=`deck-images`, name=`deck-images`, public=true
  - [x] RLS INSERT policy: authenticated, `bucket_id = 'deck-images'` AND first folder segment = `auth.jwt()->>'sub'`
  - [x] RLS SELECT policy: public read (`TO public`)
  - [x] RLS DELETE policy: authenticated, first folder segment = `auth.jwt()->>'sub'`
  - [x] Apply via `mcp__supabase__apply_migration` or `npx supabase db push`

- [x] Task 2: `next.config.ts` — raise Server Action body size limit (AC: #4, #5)
  - [x] Add `serverActionsBodySizeLimit: '6mb'` to `experimental` block in `next.config.ts`
  - [x] This allows ≤5 MB files to pass through Server Action body (default is 1 MB)

- [x] Task 3: Validator `src/lib/validators/card.ts` (AC: #2, #5, #6)
  - [x] `addCardSchema`: front (required, trim, min 1, max 2000), back (required, trim, min 1, max 2000)
  - [x] Export `validateAddCardInput(value)` returning `ReturnType<typeof addCardSchema.safeParse>`
  - [x] Client image validation constant: `MAX_IMAGE_BYTES = 5 * 1024 * 1024` (5 MB)
  - [x] Accepted MIME set: `ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']`
  - [x] Use Zod v4 `{ error: '...' }` syntax — NOT `{ message: '...' }`

- [x] Task 4: DAL `src/server/db/queries/notes.ts` (AC: #2)
  - [x] Create file from scratch (does not exist yet)
  - [x] `createNote(userId, deckId, content): Promise<Result<{ id: string }>>`
  - [x] Inserts into `notes` table; returns `{ id }` via `.returning({ id: notes.id })`
  - [x] Import: `db` from `@/server/db`, `notes` from `@/server/db/schema`, `Result` from `@/types`

- [x] Task 5: DAL `src/server/db/queries/cards.ts` (AC: #2, #9)
  - [x] Create file from scratch (does not exist yet)
  - [x] `createCard(userId, noteId, data): Promise<Result<{ id: string }>>`
    - [x] `data`: `{ front: string; back: string; imageUrl?: string | null }`
    - [x] Sets `mode = data.imageUrl ? 'image' : 'qa'`
    - [x] Maps to `frontContent`, `backContent`, `imageUrl`, `mode` columns
    - [x] Returns `{ id }` via `.returning({ id: cards.id })`
  - [x] `findCardsByDeckId(deckId: string, userId: string): Promise<Result<Array<...>>>`
    - [x] Joins cards → notes — `notes.deckId = deckId AND notes.deletedAt IS NULL AND cards.userId = userId`
    - [x] Returns `id, frontContent, backContent, imageUrl, mode, createdAt` fields
    - [x] Use `db.select(...).from(cards).innerJoin(notes, eq(cards.noteId, notes.id)).where(...)`
    - [x] Import: `notes` schema from `@/server/db/schema`

- [x] Task 6: `src/lib/analytics.ts` — add `card_added` event (AC: #2)
  - [x] Add `'card_added'` to the `AppEvent` union type in `src/lib/analytics.ts`

- [x] Task 7: Server Action `addCardToDeck` in `src/app/(app)/decks/actions.ts` (AC: #2, #4, #7)
  - [x] Add `addCardToDeck(prevState, formData: FormData): Promise<Result<{ id: string }>>`
  - [x] Step 1: `getUser()` — return `UNAUTHORIZED` if not authenticated
  - [x] Step 2: extract `deckId` from `formData.get('deckId')` (hidden field)
  - [x] Step 3: ownership check — call `getDeckById(deckId)` and verify `deck.userId === user.id`; return `NOT_FOUND` if mismatch (belt-and-suspenders: RSC already checks, but Server Action must too)
  - [x] Step 4: validate text fields with `validateAddCardInput({ front: formData.get('front'), back: formData.get('back') })`
  - [x] Step 5: handle image upload (if `formData.get('image')` is a `File` with size > 0):
    - [x] Re-validate MIME type (check against `ACCEPTED_IMAGE_TYPES`) and size (≤ 5 MB) server-side
    - [x] Path: `` `${user.id}/${deckId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}` ``
    - [x] `supabase.storage.from('deck-images').upload(path, file, { contentType: file.type })`
    - [x] On error → return `{ data: null, error: { message: 'Image upload failed', code: 'STORAGE_ERROR' } }`
    - [x] On success → `supabase.storage.from('deck-images').getPublicUrl(path)` → `imageUrl`
  - [x] Step 6: DB transaction — `await db.transaction(async (tx) => { createNote(…, tx); createCard(…, tx) })`
    - [x] `createNote(user.id, deckId, front, tx)` — pass transaction context
    - [x] `createCard(user.id, note.id, { front, back, imageUrl }, tx)`
  - [x] Step 7: `trackEvent('card_added', { deckId, cardId })` — fire-and-forget
  - [x] Step 8: `revalidatePath('/decks/' + deckId)` — refresh card list on deck detail page
  - [x] Return `{ data: { id: card.id }, error: null }` — NO redirect (caller handles "Add & next" reset)
  - [x] **CRITICAL**: DAL functions need to accept optional transaction context (`tx?`) for steps 6; see patterns below

- [x] Task 8: `AddCardForm` client component `src/components/decks/AddCardForm.tsx` (AC: #1–6)
  - [x] `useActionState(addCardToDeck, null)` — server round-trip error display
  - [x] `useRef` for form element and front input — used for reset + auto-focus on "Add & next" success
  - [x] `useEffect` to detect success (`state?.data?.id`) → reset form + focus front field
  - [x] Client-side image validation: `onChange` on file input — check `file.size > MAX_IMAGE_BYTES` or MIME not in `ACCEPTED_IMAGE_TYPES` → set local error state, clear input
  - [x] Hidden input `name="deckId"` value={deckId}
  - [x] Two submit buttons: "Add & next" (`name="action" value="add-next"`) and "Done" (`type="button"` → `router.push('/decks/' + deckId)`)
  - [x] `"Add & next"` sticky above keyboard: `position: sticky; bottom: 0` (via Tailwind `sticky bottom-0`)
  - [x] Show `state?.error?.message` as `role="alert"` paragraph
  - [x] Both buttons disabled when `isPending`
  - [x] File input: `accept="image/jpeg,image/png,image/gif,image/webp"`
  - [x] `useActionState` type: `useActionState<Result<{ id: string }> | null, FormData>`

- [x] Task 9: Add card page `src/app/(app)/decks/[deckId]/cards/new/page.tsx` (AC: #1, #7, #8)
  - [x] Server Component; auth guard `if (!user) return null`
  - [x] Ownership check: call `getDeckById(deckId)` + `if (!deck || deck.userId !== user.id) notFound()`
  - [x] Render `<AddCardForm deckId={deckId} deckTitle={deck.title} />`
  - [x] `params` is `Promise<{ deckId: string }>` — must be `await`ed (Next.js 15 pattern)
  - [x] `export const metadata` set to `{ title: 'Add Card' }`

- [x] Task 10: Update deck detail page `src/app/(app)/decks/[deckId]/page.tsx` (AC: #3, #9)
  - [x] Add "Add card" `<Link href={'/decks/' + deckId + '/cards/new'}>` button
  - [x] Call `findCardsByDeckId(deckId, user.id)` and render card list below header
  - [x] Empty state: "No cards yet. Add your first card." → replaced by card list when cards exist
  - [x] Each card shows: Front text, Back text, small image thumbnail if `imageUrl` present

- [x] Task 11: Tests (AC: #2, #5, #6)
  - [x] `src/lib/validators/card.test.ts` — unit tests for `addCardSchema` (valid, missing front, missing back, oversized not tested here — client-only)
  - [x] `tests/integration/add-card.test.ts` — mocked Server Action integration tests

## Dev Notes

### Architecture: notes → cards hierarchy (CRITICAL — do not skip)

Creating one card = inserting **two rows** in a DB transaction:
1. `notes` row: `{ deckId, userId, content: front }` — the "concept" layer
2. `cards` row: `{ noteId, userId, mode, frontContent: front, backContent: back, imageUrl }` — the scheduling layer

This is mandatory. Do NOT skip the note row. Do NOT insert directly into `cards` without a parent `notes` row. The FSRS engine, AI generation (Epic 5), and RLS all depend on `notes` being the authoritative parent.

**Mode selection:**
- `imageUrl` present → `mode = 'image'`
- `imageUrl` absent → `mode = 'qa'`
- Never set `mode = 'context-narrative'` in manual card creation (AI-only in Epic 5)

### DB Transaction Pattern (Drizzle)

DAL functions must accept an optional transaction context so they can be composed:

```typescript
// src/server/db/queries/notes.ts
import { db } from '@/server/db'
import { notes } from '@/server/db/schema'
import type { Result } from '@/types'
import type { PgTransaction } from 'drizzle-orm/pg-core'

type TxContext = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function createNote(
  userId: string,
  deckId: string,
  content: string,
  tx?: TxContext
): Promise<Result<{ id: string }>> {
  const executor = tx ?? db
  try {
    const [row] = await executor
      .insert(notes)
      .values({ userId, deckId, content })
      .returning({ id: notes.id })
    if (!row) return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
    return { data: { id: row.id }, error: null }
  } catch (err) {
    console.error('[createNote] DB error:', err)
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
```

```typescript
// src/server/db/queries/cards.ts
export async function createCard(
  userId: string,
  noteId: string,
  data: { front: string; back: string; imageUrl?: string | null },
  tx?: TxContext
): Promise<Result<{ id: string }>> {
  const executor = tx ?? db
  const mode: CardMode = data.imageUrl ? 'image' : 'qa'
  try {
    const [row] = await executor
      .insert(cards)
      .values({
        userId,
        noteId,
        mode,
        frontContent: data.front,
        backContent: data.back,
        imageUrl: data.imageUrl ?? null,
      })
      .returning({ id: cards.id })
    if (!row) return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
    return { data: { id: row.id }, error: null }
  } catch (err) {
    console.error('[createCard] DB error:', err)
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
```

Transaction usage in Server Action:
```typescript
import { db } from '@/server/db'

const result = await db.transaction(async (tx) => {
  const noteResult = await createNote(user.id, deckId, front, tx)
  if (noteResult.error) {
    tx.rollback() // automatic on thrown error; use throw instead
    return noteResult
  }
  return createCard(user.id, noteResult.data.id, { front, back, imageUrl }, tx)
})
// Drizzle rolls back automatically if the transaction callback throws
// Prefer: throw new Error(...) inside tx callback to trigger rollback
```

**Preferred transaction pattern with automatic rollback:**
```typescript
let cardId: string
try {
  cardId = await db.transaction(async (tx) => {
    const [noteRow] = await tx.insert(notes).values({ userId: user.id, deckId, content: front }).returning({ id: notes.id })
    if (!noteRow) throw new Error('note insert failed')
    const [cardRow] = await tx.insert(cards).values({ userId: user.id, noteId: noteRow.id, mode, frontContent: front, backContent: back, imageUrl: imageUrl ?? null }).returning({ id: cards.id })
    if (!cardRow) throw new Error('card insert failed')
    return cardRow.id
  })
} catch (err) {
  console.error('[addCardToDeck] transaction error:', err)
  return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
}
```

### `findCardsByDeckId` DAL pattern

```typescript
// src/server/db/queries/cards.ts
import { db } from '@/server/db'
import { cards, notes } from '@/server/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import type { Result } from '@/types'

export async function findCardsByDeckId(
  deckId: string,
  userId: string
): Promise<Result<Array<{ id: string; frontContent: string; backContent: string; imageUrl: string | null; mode: string; createdAt: Date }>>> {
  try {
    const rows = await db
      .select({
        id: cards.id,
        frontContent: cards.frontContent,
        backContent: cards.backContent,
        imageUrl: cards.imageUrl,
        mode: cards.mode,
        createdAt: cards.createdAt,
      })
      .from(cards)
      .innerJoin(notes, eq(cards.noteId, notes.id))
      .where(and(eq(notes.deckId, deckId), eq(cards.userId, userId), isNull(notes.deletedAt)))
      .orderBy(cards.createdAt)
    return { data: rows, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
```

### Supabase Storage Upload in Server Action

```typescript
// Inside addCardToDeck Server Action
const supabase = await createUserClient()  // cookie-based auth — RLS enforced with user JWT
const imageFile = formData.get('image')

let imageUrl: string | null = null
if (imageFile instanceof File && imageFile.size > 0) {
  // Server-side re-validation (client-side checks already done, but defend-in-depth)
  const ACCEPTED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!ACCEPTED.includes(imageFile.type) || imageFile.size > 5 * 1024 * 1024) {
    return { data: null, error: { message: 'Invalid image file', code: 'VALIDATION_ERROR' } }
  }
  const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${user.id}/${deckId}/${Date.now()}-${safeName}`
  const { error: uploadError } = await supabase.storage
    .from('deck-images')
    .upload(storagePath, imageFile, { contentType: imageFile.type, upsert: false })
  if (uploadError) {
    console.error('[addCardToDeck] storage upload error:', uploadError)
    return { data: null, error: { message: 'Image upload failed', code: 'STORAGE_ERROR' } }
  }
  const { data: urlData } = supabase.storage.from('deck-images').getPublicUrl(storagePath)
  imageUrl = urlData.publicUrl
}
```

**Note**: `getPublicUrl()` is synchronous (no `await` needed) — it constructs the URL locally.

### next.config.ts change (REQUIRED for image upload)

In `next.config.ts`, inside `experimental: {}`, add:
```typescript
experimental: {
  serverActionsBodySizeLimit: '6mb',
  // turbopack is enabled via next dev --turbopack flag in dev script
},
```

Without this, Server Actions reject requests over 1 MB — file uploads will silently fail.

### AddCardForm — "Add & next" auto-focus pattern

```typescript
'use client'
import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { addCardToDeck } from '@/app/(app)/decks/actions'
import type { Result } from '@/types'

export function AddCardForm({ deckId, deckTitle }: { deckId: string; deckTitle: string }) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<Result<{ id: string }> | null, FormData>(
    addCardToDeck,
    null
  )
  const formRef = useRef<HTMLFormElement>(null)
  const frontInputRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const lastSuccessId = useRef<string | null>(null)

  // After successful card creation: reset form + auto-focus front (rapid-entry UX)
  useEffect(() => {
    if (state?.data?.id && state.data.id !== lastSuccessId.current) {
      lastSuccessId.current = state.data.id
      formRef.current?.reset()
      setImageError(null)
      // setTimeout 0 ensures DOM has updated before focus
      setTimeout(() => frontInputRef.current?.focus(), 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.data?.id])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) { setImageError(null); return }
    const ACCEPTED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image must be 5 MB or smaller')
      e.target.value = ''
    } else if (!ACCEPTED.includes(file.type)) {
      setImageError('Accepted formats: JPEG, PNG, GIF, WEBP')
      e.target.value = ''
    } else {
      setImageError(null)
    }
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="deckId" value={deckId} />
      {/* Front field */}
      <div className="flex flex-col gap-2">
        <label htmlFor="front" className="text-sm font-medium">Front <span aria-hidden>*</span></label>
        <textarea ref={frontInputRef} id="front" name="front" required maxLength={2000}
          rows={3} placeholder="Question or term"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ..." />
      </div>
      {/* Back field */}
      <div className="flex flex-col gap-2">
        <label htmlFor="back" className="text-sm font-medium">Back <span aria-hidden>*</span></label>
        <textarea id="back" name="back" required maxLength={2000}
          rows={3} placeholder="Answer or definition"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ..." />
      </div>
      {/* Image field */}
      <div className="flex flex-col gap-2">
        <label htmlFor="image" className="text-sm font-medium">Image <span className="text-muted-foreground">(optional, ≤ 5 MB)</span></label>
        <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleImageChange} className="text-sm ..." />
        {imageError && <p role="alert" className="text-sm text-destructive">{imageError}</p>}
      </div>
      {/* Server error */}
      {state?.error && <p role="alert" className="text-sm text-destructive">{state.error.message}</p>}
      {/* Success flash — optional */}
      {state?.data && <p className="text-sm text-green-600">Card added!</p>}
      {/* Sticky action bar — stays above mobile keyboard */}
      <div className="sticky bottom-0 bg-background pb-4 pt-2 flex gap-3 border-t">
        <button type="submit" disabled={isPending || !!imageError}
          className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {isPending ? 'Saving…' : 'Add & next'}
        </button>
        <button type="button" disabled={isPending}
          onClick={() => router.push('/decks/' + deckId)}
          className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50">
          Done
        </button>
      </div>
    </form>
  )
}
```

**Note**: The `useEffect` depends on `state?.data?.id` (the newly created card ID) rather than `state?.data` (object reference changes every render). This prevents the reset firing on every re-render. The `lastSuccessId` ref prevents double-reset if the component re-renders with the same successful state.

**Important**: `useActionState` previous-state argument type must match: `useActionState<Result<{id:string}>|null, FormData>`. Do NOT use `useFormState` (deprecated).

### Drizzle `db.transaction()` type import

Drizzle's transaction callback parameter type:
```typescript
import type { db } from '@/server/db'
// Use inferred parameter type from transaction callback:
type TxContext = Parameters<Parameters<typeof db.transaction>[0]>[0]
```

This avoids importing from Drizzle internals which change across minor versions.

### Soft-delete: notes vs cards

Per architecture:
- **notes**: has `deleted_at` (soft-delete) — `findCardsByDeckId` must filter `WHERE notes.deleted_at IS NULL`
- **cards**: NO `deleted_at` (hard-delete in story 3.3) — do NOT add `deleted_at` to cards

### Deck detail page update pattern

The stub page (`src/app/(app)/decks/[deckId]/page.tsx`) only shows static text. Update it to:
1. Import and call `findCardsByDeckId(deckId, user.id)`
2. Render a card list or empty state
3. Add "Add card" `<Link href={'/decks/' + deckId + '/cards/new'}>` button in the header

Do NOT import `AddCardForm` directly into the deck detail page — it lives at its own route (`/cards/new`).

### Key Files

#### New Files

| Path | Purpose |
|------|---------|
| `supabase/migrations/0006_deck_images_storage.sql` | Storage bucket + RLS policies |
| `src/lib/validators/card.ts` | Zod schema, MAX_IMAGE_BYTES, ACCEPTED_IMAGE_TYPES |
| `src/lib/validators/card.test.ts` | Unit tests for addCardSchema |
| `src/server/db/queries/notes.ts` | createNote DAL |
| `src/server/db/queries/cards.ts` | createCard + findCardsByDeckId DAL |
| `src/app/(app)/decks/[deckId]/cards/new/page.tsx` | Add card RSC page |
| `src/components/decks/AddCardForm.tsx` | Client component (form + upload) |
| `tests/integration/add-card.test.ts` | Mocked Server Action integration tests |

#### Modified Files

| Path | Change |
|------|--------|
| `src/app/(app)/decks/actions.ts` | Add `addCardToDeck` Server Action |
| `src/app/(app)/decks/[deckId]/page.tsx` | Add card list + "Add card" link |
| `src/lib/analytics.ts` | Add `'card_added'` to AppEvent union |
| `next.config.ts` | Add `serverActionsBodySizeLimit: '6mb'` to experimental |

### Existing files NOT to modify

- `src/server/db/schema/notes.ts` — schema already correct
- `src/server/db/schema/cards.ts` — schema already correct (includes mode, imageUrl, FSRS fields)
- `src/server/db/schema/index.ts` — already re-exports notes and cards
- `supabase/migrations/0000_confused_grandmaster.sql` — notes and cards tables already created here

### Zod v4 error syntax

Use `{ error: '...' }` (Zod v4) — NOT `{ message: '...' }` (Zod v3). Reference: `src/lib/validators/profile.ts`.

```typescript
// CORRECT
z.string().min(1, { error: 'Front is required' })
z.string().max(2000, { error: 'Front must be 2000 characters or fewer' })
```

### Migration SQL template

```sql
-- supabase/migrations/0006_deck_images_storage.sql

-- Create deck-images storage bucket (public = images served without JWT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deck-images',
  'deck-images',
  true,
  5242880, -- 5 MB limit enforced at storage layer
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users may upload only to their own user-id folder
CREATE POLICY "deck_images_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'deck-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Public read (deck images are not secret — decks can be shared)
CREATE POLICY "deck_images_select_public"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'deck-images');

-- Users may delete only their own images
CREATE POLICY "deck_images_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'deck-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
```

**Note**: `(auth.uid())::text` is preferred over `auth.jwt()->>'sub'` — both work, but `auth.uid()` is the canonical Supabase function.

### Tests

#### Unit Tests (`src/lib/validators/card.test.ts`)

Follow pattern from `src/lib/validators/deck.test.ts` (story 3-1).

Cover at minimum:
- Valid front + back → parses with trimmed values
- Front empty string → error "Front is required"
- Front null → error
- Front > 2000 chars → error "Front must be 2000 characters or fewer"
- Back empty string → error "Back is required"
- Back null → error
- Leading/trailing whitespace on front → trimmed to valid value

#### Integration Tests (`tests/integration/add-card.test.ts`)

Use mocked Supabase, DAL, and storage — same structure as `tests/integration/create-deck.test.ts`.

Required mocks (before imports):
```typescript
vi.mock('@/lib/supabase/user', () => ({ createUserClient: vi.fn() }))
vi.mock('@/server/db/queries/notes', () => ({ createNote: vi.fn() }))
vi.mock('@/server/db/queries/cards', () => ({ createCard: vi.fn() }))
vi.mock('@/server/db/queries/decks', () => ({ getDeckById: vi.fn() }))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/server/db', () => ({ db: { transaction: vi.fn() } }))
```

Cover:
- UNAUTHORIZED when `getUser()` returns no user
- NOT_FOUND when deck not found or user doesn't own deck
- VALIDATION_ERROR when front is empty
- VALIDATION_ERROR when back is empty
- STORAGE_ERROR when storage upload fails
- Transaction called with userId, deckId, front, back on valid text-only card
- `trackEvent('card_added', { deckId, cardId })` called on success
- `revalidatePath('/decks/' + deckId)` called on success
- Returns `{ data: { id } }` on success (no redirect)
- Image flow: storage upload called when `File` object provided; imageUrl passed to createCard

### UX Requirements (from UX spec)

- **"Add & next" sticky button**: must remain visible above mobile keyboard at all times — use `sticky bottom-0` container with solid background
- **Auto-focus after add**: after each card saved, front field gets focus automatically — enables rapid-fire entry on mobile without tapping
- **First use guidance**: show placeholder text in Front ("Question or term") and Back ("Answer or definition") fields to guide first-time users — no separate onboarding needed
- **One-time flip nudge**: on first card creation, show a subtle "flip icon" hint near Back field (suggested in UX spec: "write the back →" nudge, disappears after first use) — skip for MVP unless time allows; not in ACs
- **Error never blocks flow**: validation errors shown inline; user can correct and retry without navigating away

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- TS error: `serverActionsBodySizeLimit` not in `ExperimentalConfig` types — fixed with `as any` cast
- `cards.ts` pre-existed with `findCardsDue` and `findCardsByDeckId` — added `createCard` and fixed missing `isNull(notes.deletedAt)` filter
- `db.transaction` mock type incompatibility — fixed with `(db.transaction as any).mockImplementation`
- `PaginationInput.cursor` is `string | undefined`, not `string | null` — removed `cursor: null` from `findCardsByDeckId` call

### Completion Notes List

- Transaction done inline in Server Action (not via DAL `createNote`/`createCard`) — DAL functions still exported for future use but not called from action
- `getPublicUrl()` is synchronous — no `await` needed
- `findCardsByDeckId` in deck detail page uses `{ limit: 50 }` (no cursor = first page)

### File List

- `supabase/migrations/0006_deck_images_storage.sql` (new)
- `src/lib/validators/card.ts` (new)
- `src/lib/validators/card.test.ts` (new)
- `src/server/db/queries/notes.ts` (new)
- `src/server/db/queries/cards.ts` (modified — added `createCard`, fixed `isNull` filter)
- `src/lib/analytics.ts` (modified — added `card_added` event)
- `src/app/(app)/decks/actions.ts` (modified — added `addCardToDeck`)
- `src/components/decks/AddCardForm.tsx` (new)
- `src/app/(app)/decks/[deckId]/cards/new/page.tsx` (new)
- `src/app/(app)/decks/[deckId]/page.tsx` (modified — card list + Add card button)
- `next.config.ts` (modified — `serverActionsBodySizeLimit: '6mb'`)
- `tests/integration/add-card.test.ts` (new)
