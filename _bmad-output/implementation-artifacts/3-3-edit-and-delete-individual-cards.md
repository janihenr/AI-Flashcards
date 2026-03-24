# Story 3.3: Edit and Delete Individual Cards

**Status:** ready-for-dev
**Epic:** Epic 3 — Deck & Card Library
**Story Key:** 3-3-edit-and-delete-individual-cards
**Created:** 2026-03-24

---

## Story

As an authenticated user,
I want to edit and delete individual cards in a deck I own,
So that I can keep my deck content accurate and up to date.

---

## Acceptance Criteria

1. **Given** I am viewing a card in a deck I own **When** I click "Edit" **Then** I navigate to `/decks/{deckId}/cards/{cardId}/edit` with the card form pre-filled with the current Front, Back, and image (if present)

2. **Given** I make changes and click "Save" **When** the update is submitted **Then** the card `frontContent`/`backContent`/`imageUrl`/`mode` and the parent `notes.content` are updated via the DAL **And** I am redirected to `/decks/{deckId}` **And** the updated content is immediately visible

3. **Given** I click "Delete" on a card in the deck detail page **When** I confirm the deletion **Then** the card row is hard-deleted from the `cards` table **And** the parent `notes` row is soft-deleted (`deleted_at = NOW()`) **And** the card no longer appears in the card list

4. **Given** the deleted card had an associated image **When** deletion succeeds **Then** the image is removed from Supabase Storage `deck-images` bucket

5. **Given** I upload a new image on the edit form **When** the update is saved **Then** the new image is uploaded to storage, `cards.image_url` is updated, and the old image (if any) is deleted from storage **And** `cards.mode` is updated to `'image'`

6. **Given** I remove the existing image via the "Remove image" checkbox **When** the update is saved **Then** `cards.image_url` is set to null, `cards.mode` is set to `'qa'`, and the old image is deleted from storage

7. **Given** I submit the edit form with an empty Front or Back **When** the form validates **Then** an error is shown before the Server Action is called **And** no data is sent to the server

8. **Given** I attempt to edit or delete a card in a deck I do not own **When** the request reaches the server **Then** it is rejected (ownership check enforced in Server Actions — belt-and-suspenders beyond RLS)

9. **Given** I am an unauthenticated user **When** I navigate to `/decks/{deckId}/cards/{cardId}/edit` **Then** I am redirected to `/login` by middleware

---

## Tasks / Subtasks

- [ ] Task 1: DAL — `getCardById` in `src/server/db/queries/cards.ts` (AC: #1, #8)
  - [ ] `getCardById(cardId: string, userId: string): Promise<Result<{id, noteId, frontContent, backContent, imageUrl, mode, userId}>>`
  - [ ] `SELECT id, note_id, front_content, back_content, image_url, mode, user_id FROM cards WHERE id = cardId AND user_id = userId`
  - [ ] Returns `NOT_FOUND` error if no row or user doesn't own

- [ ] Task 2: DAL — `updateCard` in `src/server/db/queries/cards.ts` (AC: #2, #5, #6)
  - [ ] `updateCard(cardId: string, userId: string, data: {front: string; back: string; imageUrl?: string | null; mode: CardMode}): Promise<Result<void>>`
  - [ ] DB transaction: update `cards` row + update `notes.content` (= front) in same tx
  - [ ] Cards update: `SET front_content, back_content, image_url, mode, updated_at = NOW() WHERE id = cardId AND user_id = userId`
  - [ ] Notes update: `SET content = front WHERE id = noteId` (must first query noteId from cards row, or accept noteId param)
  - [ ] Use `TxContext` pattern from story 3.2 for transaction
  - [ ] Return `NOT_FOUND` if cards row not found (user doesn't own) - check updated row count

- [ ] Task 3: DAL — `deleteCard` in `src/server/db/queries/cards.ts` (AC: #3, #4)
  - [ ] `deleteCard(cardId: string, userId: string): Promise<Result<{noteId: string; imageUrl: string | null}>>`
  - [ ] Fetches card first to get `noteId` and `imageUrl` (needed for note soft-delete and storage cleanup)
  - [ ] DB transaction: hard-delete `cards` row + soft-delete `notes` row (set `deleted_at = NOW()`)
  - [ ] Cards delete: `DELETE FROM cards WHERE id = cardId AND user_id = userId`
  - [ ] Notes soft-delete: `UPDATE notes SET deleted_at = NOW() WHERE id = noteId`
  - [ ] Returns `{ data: { noteId, imageUrl }, error: null }` so caller can clean up storage
  - [ ] Returns `NOT_FOUND` if card not found or not owned

- [ ] Task 4: Validator — `editCardSchema` in `src/lib/validators/card.ts` (AC: #7)
  - [ ] Reuse `addCardSchema` — same validation rules (front: 1–2000, back: 1–2000, Zod v4 `{ error: '...' }`)
  - [ ] Add `editCardSchema = addCardSchema` (alias) + `validateEditCardInput` function
  - [ ] No new file needed — add to existing `src/lib/validators/card.ts`

- [ ] Task 5: Server Action `updateCard` in `src/app/(app)/decks/actions.ts` (AC: #2, #5, #6, #8)
  - [ ] `updateCard(_prev: Result<void> | null, formData: FormData): Promise<Result<void>>`
  - [ ] Step 1: `getUser()` — return UNAUTHORIZED if not authenticated
  - [ ] Step 2: extract `cardId` and `deckId` from hidden form fields
  - [ ] Step 3: deck ownership check — `getDeckById(deckId)` + verify `deck.userId === user.id`
  - [ ] Step 4: load current card — `getCardById(cardId, user.id)` (also verifies card ownership)
  - [ ] Step 5: validate text — `validateEditCardInput({ front, back })`
  - [ ] Step 6: handle image changes (3 branches):
    - New image uploaded: upload to storage (same path pattern as addCardToDeck), set `imageUrl` to new URL, delete old image if exists
    - `removeImage = 'true'` in formData AND current `card.imageUrl` exists: set `imageUrl = null`, delete old from storage
    - Otherwise: keep `card.imageUrl` (pass through unchanged)
  - [ ] Step 7: call `updateCard` DAL with updated data
  - [ ] Step 8: `revalidatePath('/decks/' + deckId)`
  - [ ] Step 9: `redirect('/decks/' + deckId)` — throws NEXT_REDIRECT, do NOT wrap in try/catch
  - [ ] Storage delete helper: `supabase.storage.from('deck-images').remove([path])` (fire-and-forget, log errors)

- [ ] Task 6: Server Action `deleteCard` in `src/app/(app)/decks/actions.ts` (AC: #3, #4, #8)
  - [ ] `deleteCard(_prev: Result<void> | null, formData: FormData): Promise<Result<void>>`
  - [ ] Step 1: `getUser()` — return UNAUTHORIZED
  - [ ] Step 2: extract `cardId` and `deckId` from hidden form fields
  - [ ] Step 3: deck ownership check — `getDeckById(deckId)` + verify `deck.userId === user.id`
  - [ ] Step 4: call `deleteCard` DAL — returns `{ noteId, imageUrl }`
  - [ ] Step 5: if `imageUrl`, delete from storage (fire-and-forget)
  - [ ] Step 6: `revalidatePath('/decks/' + deckId)`
  - [ ] Return `{ data: null, error: null }` (no redirect — stays on deck detail page)
  - [ ] **Name collision**: the DAL function and Server Action both named `deleteCard` — rename Server Action to `deleteCardAction` OR import DAL with alias: `import { deleteCard as deleteCardDAL } from '@/server/db/queries/cards'`

- [ ] Task 7: `EditCardForm` client component `src/components/decks/EditCardForm.tsx` (AC: #1, #2, #5–7)
  - [ ] Props: `{ card: { id: string; frontContent: string; backContent: string; imageUrl: string | null; mode: string }, deckId: string }`
  - [ ] `useActionState(updateCard, null)` — server round-trip
  - [ ] Hidden inputs: `name="cardId"` value={card.id}, `name="deckId"` value={deckId}
  - [ ] Pre-filled textareas: `defaultValue={card.frontContent}` and `defaultValue={card.backContent}` (NOT `value` — uncontrolled)
  - [ ] Image section:
    - If `card.imageUrl` exists AND no new upload AND `removeImage` not checked: show current image thumbnail (64×64, `<Image>` from next/image)
    - `<input type="checkbox" name="removeImage" value="true" />` "Remove current image" — only shown if `card.imageUrl` exists
    - File input for new image (same accept/validation as AddCardForm)
    - **Rule**: if new file selected, the removeImage checkbox is ignored (new upload takes precedence)
  - [ ] Client-side image validation: same `handleImageChange` pattern from AddCardForm (check size + MIME)
  - [ ] Show `state?.error?.message` as `role="alert"`
  - [ ] Submit "Save changes" button + "Cancel" link → `router.back()` or `/decks/${deckId}`
  - [ ] Both disabled when `isPending`
  - [ ] `useActionState` type: `useActionState<Result<void> | null, FormData>`

- [ ] Task 8: `DeleteCardButton` client component `src/components/decks/DeleteCardButton.tsx` (AC: #3)
  - [ ] Props: `{ cardId: string; deckId: string }`
  - [ ] `useActionState(deleteCard, null)` — wraps Server Action
  - [ ] **Confirmation**: on click, use `window.confirm('Delete this card? This cannot be undone.')` before submitting
  - [ ] Render as `<form action={formAction}>` with hidden `cardId` and `deckId` inputs
  - [ ] Button text: "Delete" → "Deleting…" when `isPending`
  - [ ] Show `state?.error?.message` if error
  - [ ] Button disabled when `isPending`
  - [ ] Import `deleteCard` Server Action (the action, not the DAL)

- [ ] Task 9: Edit card RSC page `src/app/(app)/decks/[deckId]/cards/[cardId]/edit/page.tsx` (AC: #1, #8, #9)
  - [ ] Server Component; auth guard `if (!user) return null`
  - [ ] `params: Promise<{ deckId: string; cardId: string }>` — must be `await`ed (Next.js 15 pattern)
  - [ ] Deck ownership check: `getDeckById(deckId)` → if `!deck || deck.userId !== user.id` → `notFound()`
  - [ ] Card load: `getCardById(cardId, user.id)` → if not found → `notFound()`
  - [ ] Render `<EditCardForm card={card} deckId={deckId} />`
  - [ ] `export const metadata = { title: 'Edit Card' }`

- [ ] Task 10: Update deck detail page `src/app/(app)/decks/[deckId]/page.tsx` (AC: #1, #3)
  - [ ] Add "Edit" link to each card list item: `<Link href={'/decks/' + deckId + '/cards/' + card.id + '/edit'}>Edit</Link>`
  - [ ] Add `<DeleteCardButton cardId={card.id} deckId={deckId} />` to each card list item
  - [ ] Both controls positioned in card list item (e.g., top-right corner with flex gap)
  - [ ] **Import**: `DeleteCardButton` is a Client Component — import normally in RSC page (Next.js handles the boundary)

- [ ] Task 11: Tests (AC: #2, #3, #7, #8)
  - [ ] `src/lib/validators/card.test.ts` — add tests for `editCardSchema` (or verify `validateEditCardInput` delegates to same schema)
  - [ ] `tests/integration/edit-card.test.ts` — mocked Server Action integration tests for `updateCard`
  - [ ] `tests/integration/delete-card.test.ts` — mocked Server Action integration tests for `deleteCard`

---

## Dev Notes

### Data Model: Edit Touch Both Tables (CRITICAL)

Creating one card = two DB rows (story 3.2). Editing one card = updating BOTH rows:

1. `notes.content` = card's **front text** (the "concept" layer)
2. `cards.frontContent` = same front text (mirrored on the scheduling layer)
3. `cards.backContent` = back text
4. `cards.imageUrl` + `cards.mode` = image state

**When editing a card, update BOTH `notes.content` and `cards.frontContent` in a single transaction.** Failing to update `notes.content` creates a stale mismatch that will break FSRS+AI lookups in later epics.

### Data Model: Delete Strategy (CRITICAL)

Per architecture and story 3.2 notes:
- **`cards`**: hard-delete (no `deleted_at` column — do NOT add one)
- **`notes`**: soft-delete via `deleted_at` timestamp

Delete sequence (must be atomic transaction):
1. Fetch card → get `noteId` + `imageUrl`
2. `DELETE FROM cards WHERE id = ? AND user_id = ?`
3. `UPDATE notes SET deleted_at = NOW() WHERE id = ?`

This ensures `findCardsByDeckId` (which filters `WHERE notes.deleted_at IS NULL`) immediately hides the card, while the notes row is preserved for GDPR export/audit trail.

**Do NOT use Drizzle's cascade here** — the note must remain (soft-deleted), not cascade-deleted.

### Name Collision: `deleteCard` (DAL vs Server Action)

Both the DAL function and the Server Action are naturally named `deleteCard`. Resolve with import alias:

```typescript
// In src/app/(app)/decks/actions.ts
import {
  getCardById,
  updateCard as updateCardDAL,
  deleteCard as deleteCardDAL,
} from '@/server/db/queries/cards'

// Server Actions use distinct names to avoid confusion:
export async function updateCardAction(_prev: ..., formData: FormData) { ... }
export async function deleteCardAction(_prev: ..., formData: FormData) { ... }
```

**Or** name them `updateCardAction` / `deleteCardAction` in actions.ts and export those names for client components to import.

### DAL: `updateCard` Pattern

The cards table does not have a Drizzle-native "did update?" check. Use `.returning({ id: cards.id })` to verify the row was found:

```typescript
export async function updateCard(
  cardId: string,
  userId: string,
  data: { front: string; back: string; imageUrl?: string | null; mode: CardMode; noteId: string }
): Promise<Result<void>> {
  try {
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(cards)
        .set({
          frontContent: data.front,
          backContent: data.back,
          imageUrl: data.imageUrl ?? null,
          mode: data.mode,
          updatedAt: new Date(),
        })
        .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
        .returning({ id: cards.id })

      if (!updated) throw new Error('card not found or not owned')

      await tx
        .update(notes)
        .set({ content: data.front })
        .where(eq(notes.id, data.noteId))
    })
    return { data: null, error: null }
  } catch (err) {
    if ((err as Error).message === 'card not found or not owned') {
      return { data: null, error: { message: 'Card not found', code: 'NOT_FOUND' } }
    }
    console.error('[updateCard] DB error:', err)
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
```

### DAL: `deleteCard` Pattern

```typescript
export async function deleteCard(
  cardId: string,
  userId: string
): Promise<Result<{ noteId: string; imageUrl: string | null }>> {
  // Fetch first to get noteId + imageUrl for cleanup
  const [card] = await db
    .select({ id: cards.id, noteId: cards.noteId, imageUrl: cards.imageUrl })
    .from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))

  if (!card) {
    return { data: null, error: { message: 'Card not found', code: 'NOT_FOUND' } }
  }

  try {
    await db.transaction(async (tx) => {
      // Hard-delete card
      await tx.delete(cards).where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
      // Soft-delete note (preserves for GDPR; hides from findCardsByDeckId filter)
      await tx.update(notes).set({ deletedAt: new Date() }).where(eq(notes.id, card.noteId))
    })
    return { data: { noteId: card.noteId, imageUrl: card.imageUrl }, error: null }
  } catch (err) {
    console.error('[deleteCard] DB error:', err)
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
```

### DAL: `getCardById` Pattern

```typescript
export async function getCardById(
  cardId: string,
  userId: string
): Promise<Result<{ id: string; noteId: string; frontContent: string; backContent: string; imageUrl: string | null; mode: string }>> {
  try {
    const [card] = await db
      .select({
        id: cards.id,
        noteId: cards.noteId,
        frontContent: cards.frontContent,
        backContent: cards.backContent,
        imageUrl: cards.imageUrl,
        mode: cards.mode,
      })
      .from(cards)
      .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))

    if (!card) return { data: null, error: { message: 'Card not found', code: 'NOT_FOUND' } }
    return { data: card, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
```

### Server Action: `updateCardAction` Pattern

```typescript
export async function updateCardAction(
  _prev: Result<void> | null,
  formData: FormData
): Promise<Result<void>> {
  const supabase = await createUserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
  }

  const cardId = formData.get('cardId')
  const deckId = formData.get('deckId')
  if (typeof cardId !== 'string' || !cardId || typeof deckId !== 'string' || !deckId) {
    return { data: null, error: { message: 'Invalid request', code: 'NOT_FOUND' } }
  }

  // Deck ownership (belt-and-suspenders)
  const deckResult = await getDeckById(deckId)
  if (deckResult.error || !deckResult.data || deckResult.data.userId !== user.id) {
    return { data: null, error: { message: 'Not found', code: 'NOT_FOUND' } }
  }

  // Card ownership + load current state (needed for imageUrl pass-through and noteId)
  const cardResult = await getCardById(cardId, user.id)
  if (cardResult.error || !cardResult.data) {
    return { data: null, error: { message: 'Card not found', code: 'NOT_FOUND' } }
  }
  const currentCard = cardResult.data

  // Validate text fields
  const parsed = validateEditCardInput({
    front: formData.get('front'),
    back: formData.get('back'),
  })
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: parsed.error.issues[0]?.message ?? 'Invalid input',
        code: 'VALIDATION_ERROR',
      },
    }
  }
  const { front, back } = parsed.data

  // Image logic (3 branches)
  let imageUrl: string | null = currentCard.imageUrl  // default: keep existing
  const imageFile = formData.get('image')
  const removeImage = formData.get('removeImage') === 'true'
  const oldImageUrl = currentCard.imageUrl

  if (imageFile instanceof File && imageFile.size > 0) {
    // Branch 1: New image uploaded
    if (!ACCEPTED_IMAGE_TYPES.includes(imageFile.type as typeof ACCEPTED_IMAGE_TYPES[number])) {
      return { data: null, error: { message: 'Invalid image type', code: 'VALIDATION_ERROR' } }
    }
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return { data: null, error: { message: 'Image must be 5 MB or smaller', code: 'VALIDATION_ERROR' } }
    }
    const safeName = (imageFile.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_') || 'image'
    const storagePath = `${user.id}/${deckId}/${Date.now()}-${safeName}`
    const { error: uploadError } = await supabase.storage
      .from('deck-images')
      .upload(storagePath, imageFile, { contentType: imageFile.type, upsert: false })
    if (uploadError) {
      console.error('[updateCardAction] storage upload error:', uploadError)
      return { data: null, error: { message: 'Image upload failed', code: 'STORAGE_ERROR' } }
    }
    const { data: urlData } = supabase.storage.from('deck-images').getPublicUrl(storagePath)
    imageUrl = urlData.publicUrl
  } else if (removeImage && oldImageUrl) {
    // Branch 2: Remove existing image
    imageUrl = null
  }
  // Branch 3: Keep existing — imageUrl already set to currentCard.imageUrl above

  const mode: CardMode = imageUrl ? 'image' : 'qa'

  const result = await updateCardDAL(cardId, user.id, {
    front,
    back,
    imageUrl,
    mode,
    noteId: currentCard.noteId,
  })
  if (result.error) return result

  // Fire-and-forget: delete old image from storage after successful DB update
  if (oldImageUrl && oldImageUrl !== imageUrl) {
    const oldPath = oldImageUrl.split('/object/public/deck-images/')[1]
    if (oldPath) {
      supabase.storage.from('deck-images').remove([decodeURIComponent(oldPath)]).catch((e) => {
        console.error('[updateCardAction] old image cleanup failed:', e)
      })
    }
  }

  revalidatePath(`/decks/${deckId}`)
  redirect(`/decks/${deckId}`)  // throws NEXT_REDIRECT — do NOT wrap in try/catch
}
```

**Critical**: `redirect()` from `next/navigation` throws `NEXT_REDIRECT` internally. Place it AFTER all async operations and do NOT put it inside try/catch.

### Server Action: `deleteCardAction` Pattern

```typescript
export async function deleteCardAction(
  _prev: Result<void> | null,
  formData: FormData
): Promise<Result<void>> {
  const supabase = await createUserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
  }

  const cardId = formData.get('cardId')
  const deckId = formData.get('deckId')
  if (typeof cardId !== 'string' || !cardId || typeof deckId !== 'string' || !deckId) {
    return { data: null, error: { message: 'Invalid request', code: 'NOT_FOUND' } }
  }

  // Deck ownership check
  const deckResult = await getDeckById(deckId)
  if (deckResult.error || !deckResult.data || deckResult.data.userId !== user.id) {
    return { data: null, error: { message: 'Not found', code: 'NOT_FOUND' } }
  }

  const result = await deleteCardDAL(cardId, user.id)
  if (result.error) return result

  // Fire-and-forget: delete image from storage
  if (result.data.imageUrl) {
    const path = result.data.imageUrl.split('/object/public/deck-images/')[1]
    if (path) {
      supabase.storage.from('deck-images').remove([decodeURIComponent(path)]).catch((e) => {
        console.error('[deleteCardAction] image cleanup failed:', e)
      })
    }
  }

  revalidatePath(`/decks/${deckId}`)
  return { data: null, error: null }  // No redirect — user stays on deck detail page
}
```

### EditCardForm: Image State Management

The edit form must handle 3 image states:
1. **Has existing image, no new upload, not removing** → show thumbnail, pass `imageUrl` through unchanged
2. **New file selected** → client-side validates, old thumbnail hidden, new preview shown (optional), new image uploaded on submit
3. **"Remove image" checked** → hidden field `name="removeImage" value="true"` submitted

Use `useState` for `removeImage` checkbox state. If a new file is selected while "Remove" is checked, new file takes precedence (uncheck removeImage internally or the server-side logic handles it: "new image file wins over removeImage").

```typescript
// Key state in EditCardForm:
const [imageError, setImageError] = useState<string | null>(null)
const [removeImage, setRemoveImage] = useState(false)
const [newFileSelected, setNewFileSelected] = useState(false)

function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) { setImageError(null); setNewFileSelected(false); return }
  // ... same validation as AddCardForm ...
  setNewFileSelected(true)
  setRemoveImage(false)  // new file overrides remove intent
}
```

### EditCardForm: Uncontrolled Fields for Pre-fill

Use `defaultValue` (not `value`) for pre-filled textarea fields — keeps them uncontrolled, avoids controlled component complexity with Server Actions:

```typescript
<textarea
  name="front"
  defaultValue={card.frontContent}
  required
  maxLength={2000}
/>
<textarea
  name="back"
  defaultValue={card.backContent}
  required
  maxLength={2000}
/>
```

### `useActionState` for Delete (inline on list)

`DeleteCardButton` uses `useActionState` so it can show pending state and errors. It wraps `deleteCardAction`:

```typescript
'use client'
import { useActionState } from 'react'
import { deleteCardAction } from '@/app/(app)/decks/actions'

export function DeleteCardButton({ cardId, deckId }: { cardId: string; deckId: string }) {
  const [state, formAction, isPending] = useActionState<Result<void> | null, FormData>(
    deleteCardAction,
    null
  )

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!window.confirm('Delete this card? This cannot be undone.')) {
      e.preventDefault()  // prevent form submission
    }
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="cardId" value={cardId} />
      <input type="hidden" name="deckId" value={deckId} />
      <button type="submit" onClick={handleClick} disabled={isPending}
        className="text-sm text-destructive hover:underline disabled:opacity-50">
        {isPending ? 'Deleting…' : 'Delete'}
      </button>
      {state?.error && (
        <p role="alert" className="text-xs text-destructive">{state.error.message}</p>
      )}
    </form>
  )
}
```

**Note**: `window.confirm` in `onClick` on a submit button with `e.preventDefault()` on cancel is the simplest confirm pattern. It works with progressive enhancement degraded to always-confirm if JS is disabled.

### Storage Path Parsing for Deletion

Both `updateCardAction` and `deleteCardAction` need to extract the storage path from a public URL for deletion. The URL format is:
```
https://{project}.supabase.co/storage/v1/object/public/deck-images/{userId}/{deckId}/{filename}
```

Extract the path after `/object/public/deck-images/`:
```typescript
const path = imageUrl.split('/object/public/deck-images/')[1]
if (path) {
  await supabase.storage.from('deck-images').remove([decodeURIComponent(path)])
}
```

This is the same pattern used in `addCardToDeck` for orphan cleanup.

### Key Files

#### New Files

| Path | Purpose |
|------|---------|
| `src/app/(app)/decks/[deckId]/cards/[cardId]/edit/page.tsx` | Edit card RSC page |
| `src/components/decks/EditCardForm.tsx` | Edit form client component |
| `src/components/decks/DeleteCardButton.tsx` | Delete button with confirm |
| `tests/integration/edit-card.test.ts` | Integration tests for updateCardAction |
| `tests/integration/delete-card.test.ts` | Integration tests for deleteCardAction |

#### Modified Files

| Path | Change |
|------|--------|
| `src/server/db/queries/cards.ts` | Add `getCardById`, `updateCard`, `deleteCard` DAL functions |
| `src/app/(app)/decks/actions.ts` | Add `updateCardAction` and `deleteCardAction` Server Actions |
| `src/lib/validators/card.ts` | Add `editCardSchema` + `validateEditCardInput` |
| `src/app/(app)/decks/[deckId]/page.tsx` | Add Edit link + DeleteCardButton to card list items |

#### Files NOT to Modify

| Path | Reason |
|------|--------|
| `src/server/db/schema/cards.ts` | Schema already correct — no `deleted_at` on cards |
| `src/server/db/schema/notes.ts` | Schema already correct — `deleted_at` already present |
| `src/server/db/schema/index.ts` | Already re-exports all schemas |
| `next.config.ts` | `serverActionsBodySizeLimit: '6mb'` already set in story 3.2 — no change needed |

### Tests

#### Integration Tests (`tests/integration/edit-card.test.ts`)

Use mocked Supabase, DAL, storage — same structure as `tests/integration/add-card.test.ts`.

Required mocks:
```typescript
vi.mock('@/lib/supabase/user', () => ({ createUserClient: vi.fn() }))
vi.mock('@/server/db/queries/cards', () => ({ getCardById: vi.fn(), updateCard: vi.fn() }))
vi.mock('@/server/db/queries/decks', () => ({ getDeckById: vi.fn() }))
vi.mock('@/lib/validators/card', () => ({
  validateEditCardInput: vi.fn(),
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
```

Cover:
- UNAUTHORIZED when `getUser()` returns no user
- NOT_FOUND when deck not found or user doesn't own deck
- NOT_FOUND when card not found
- VALIDATION_ERROR when front is empty
- VALIDATION_ERROR when back is empty
- Successful text-only update: `updateCard` DAL called with correct args, `revalidatePath` + `redirect` called
- New image upload: storage `upload` called, old image `remove` called if old exists
- Remove image: `updateCard` called with `imageUrl: null`, old image removed
- Keep image: `updateCard` called with existing `imageUrl` unchanged
- Storage error on upload: returns STORAGE_ERROR, no DB call

#### Integration Tests (`tests/integration/delete-card.test.ts`)

Required mocks:
```typescript
vi.mock('@/lib/supabase/user', () => ({ createUserClient: vi.fn() }))
vi.mock('@/server/db/queries/cards', () => ({ deleteCard: vi.fn() }))
vi.mock('@/server/db/queries/decks', () => ({ getDeckById: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
```

Cover:
- UNAUTHORIZED when not authenticated
- NOT_FOUND when deck not found or user doesn't own
- NOT_FOUND when card not found (deleteCard DAL returns NOT_FOUND)
- Success (no image): returns `{ data: null, error: null }`, `revalidatePath` called
- Success (with image): storage `remove` called with correct path
- DB error from deleteCard DAL: returned as-is, no storage call, no revalidatePath

### Existing Code Patterns to Follow

All from story 3.2 (already implemented):

1. **`createUserClient()`** — always `await createUserClient()` for auth in Server Actions
2. **`supabase.auth.getUser()`** — NEVER use `getSession()` (deprecated per Supabase security guidance)
3. **`Result<T>` type** — all DAL functions + Server Actions return `{ data: T | null, error: ErrorInfo | null }`
4. **Zod v4 syntax** — `{ error: '...' }` not `{ message: '...' }` for custom messages
5. **Transaction pattern** — `db.transaction(async (tx) => { ... })` — throw inside tx to trigger automatic rollback
6. **`TxContext` type** — `type TxContext = Parameters<Parameters<typeof db.transaction>[0]>[0]`
7. **`redirect()` placement** — after ALL async work, NOT inside try/catch
8. **`getPublicUrl()` is synchronous** — no `await` needed
9. **`useActionState` type parameter** — `useActionState<Result<T> | null, FormData>` — NOT `useFormState` (deprecated)
10. **`params` is a Promise in Next.js 15** — always `await params` in page components
11. **Image storage path** — `${user.id}/${deckId}/${Date.now()}-${safeName}`
12. **Storage cleanup** — fire-and-forget, use `.catch()` + `console.error()`

### No New DB Migration Needed

Cards table already has `updated_at` column (set to `defaultNow()` in schema). Use `updatedAt: new Date()` in the Drizzle update.

Notes table already has `deleted_at` column. Use `deletedAt: new Date()` in the soft-delete update.

No migration file needed for this story.

### Analytics Events (Optional)

The story ACs do not require analytics for edit/delete operations. Do NOT add `card_updated` or `card_deleted` to AppEvent unless explicitly requested. Keeping scope tight.

---

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Completion Notes

_to be filled by dev agent_

### File List

_to be filled by dev agent_
