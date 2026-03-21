# Story 1.4: Anonymous Cold Start Deck Study

Status: ready-for-dev

## Story

As an anonymous visitor,
I want to access and study a pre-built cold start deck without creating an account,
So that I experience the product's core value before deciding to sign up.

## Acceptance Criteria

1. **Given** the database is seeded **When** `seed.sql` is run **Then** a cold start deck titled "5 Science-Backed Memory Techniques" exists with exactly 10 cards **And** the 10 cards include at least 2 cards of each `CardMode`: `qa`, `image`, and `context-narrative` **And** the deck is owned by the system user (SYSTEM_USER_ID) and readable by anonymous sessions via RLS

2. **Given** I land on the app homepage as a new anonymous visitor **When** the page loads **Then** an anonymous Supabase session is created automatically (no login required) **And** the cold start deck "5 Science-Backed Memory Techniques" is visible and accessible

3. **Given** I click into the cold start deck **When** the study session starts **Then** the first card loads within 1 second (NFR-PERF4) **And** cards are presented one at a time with front/back flip interaction **And** my progress within the session is tracked against my anonymous session ID

4. **Given** I complete the cold start deck **When** the session ends **Then** a completion summary screen is shown **And** a clear CTA prompts me to sign up to save my progress and explore more

## Tasks / Subtasks

- [ ] Task 1: Install new packages (AC: #3)
  - [ ] `npx shadcn@latest init` — THIS STORY initializes shadcn/ui (first visible UI)
  - [ ] `pnpm add framer-motion` — card flip animation only; no other use
  - [ ] Verify Framer Motion is in regular dependencies (not devDependencies)

- [ ] Task 2: Seed cold start deck (AC: #1)
  - [ ] Add cold start deck data to `supabase/seed.sql` (append after system user insert from Story 1.2)
  - [ ] Deck: title = "5 Science-Backed Memory Techniques", ownedBy = SYSTEM_USER_ID
  - [ ] 10 cards total: at least 2 `qa`, 2 `image`, 2 `context-narrative` (fill rest with `qa`)
  - [ ] Cards cover topics: spaced repetition, active recall, elaborative interrogation, interleaving, retrieval practice
  - [ ] `image` cards: use placeholder `imageUrl` values (absolute URL strings, not actual images)
  - [ ] `context-narrative` cards: include `narrativeContext` field with short scenario text

- [ ] Task 3: RLS policy for cold start deck access (AC: #1)
  - [ ] Create/update `supabase/migrations/rls/decks_rls.sql`
  - [ ] Add `system_user_id uuid` column to `system_config` table migration; seed populates it with the system user UUID
  - [ ] RLS policy uses inline subquery: `owned_by = (SELECT system_user_id FROM system_config WHERE id = 'global')`
  - [ ] This avoids hardcoding env vars in PostgreSQL (which has no env var access) and avoids per-env UUID hardcoding
  - [ ] All other deck access rules remain (owner full CRUD, shares, etc.)
  - [ ] Verify `cards_rls.sql` also covers cards owned by system user deck

- [ ] Task 4: Create Zustand study session store (AC: #3)
  - [ ] Create `src/stores/study-session.ts` (see canonical pattern in Dev Notes)
  - [ ] Store: `cards: CardWithSchedule[]`, `currentIndex: number`, `ratings: CardReview[]`, `cardDisplayedAt: number | null`
  - [ ] Actions: `setCards()`, `rateCard(cardId, rating)`, `nextCard()`, `reset()`
  - [ ] `rateCard` captures `responseTimeMs = Date.now() - cardDisplayedAt`
  - [ ] `CardReview`: `{ cardId, rating, responseTimeMs, presentationMode: CardMode }`
  - [ ] **Do NOT persist to localStorage** — study session is ephemeral
  - [ ] For anonymous sessions: do NOT write `presentationMode` or `responseTimeMs` to DB (only after authentication)

- [ ] Task 5: Create useStudySession hook (AC: #3)
  - [ ] Create `src/hooks/useStudySession.ts`
  - [ ] Wraps `useStudySessionStore` — returns `{ currentCard, hasNext, rateCard, isComplete }`

- [ ] Task 6: Create FlashCard component (AC: #3)
  - [ ] Create `src/components/study/FlashCard.tsx` (see canonical pattern in Dev Notes)
  - [ ] Single component with `mode` prop — NOT separate QACard/ImageCard components
  - [ ] Props: `card: CardWithSchedule`, `mode: CardMode`, `onRate: (rating: Rating) => void`
  - [ ] Internal state: `isFlipped: boolean`
  - [ ] Framer Motion card flip: `transform-style: preserve-3d`, rotateY 0→180deg
  - [ ] Mode rendering strategy: switch on `mode` prop for front/back content
  - [ ] `qa`: front = question text, back = answer text
  - [ ] `image`: front = `<img src={card.imageUrl} />`, back = text label/explanation
  - [ ] `context-narrative`: front = `card.narrativeContext` (scenario), back = answer/resolution
  - [ ] Null guard for `mode='image'`: if `card.imageUrl` is null, fall back to `<p>{card.front}</p>` — never render `<img src="">` which fires a browser request to the page URL
  - [ ] Null guard for `mode='context-narrative'`: if `card.narrativeContext` is null, fall back to `<p>{card.front}</p>` — never render empty italic paragraph
  - [ ] Exhaustive switch: add `default: return <p>{card.front}</p>` case to prevent blank card if new CardMode is added
  - [ ] No shadcn/ui inside FlashCard — pure Tailwind + Framer Motion
  - [ ] Import `CardMode` from `@/types` — NEVER from schema files

- [ ] Task 7: Create RatingButtons component (AC: #3)
  - [ ] Create `src/components/study/RatingButtons.tsx`
  - [ ] FSRS-6 ratings: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
  - [ ] Only visible after card is flipped
  - [ ] Also disabled until anonymous session is confirmed: expose a `sessionReady: boolean` state from `AnonymousSessionInitializer` (via Zustand or context), disable buttons until `sessionReady === true` — prevents `rateAnonymousCard` Server Action from running with null `userId`
  - [ ] Props: `onRate: (rating: 1 | 2 | 3 | 4) => void`
  - [ ] Use shadcn/ui `Button` component

- [ ] Task 8: Create cold-start page with RSC streaming (AC: #2, #3)
  - [ ] Create `src/app/cold-start/page.tsx` (Server Component)
  - [ ] Create `src/components/shared/AnonymousSessionInitializer.tsx` — a Client Component that calls `supabase.auth.signInAnonymously()` on mount (via `useEffect`) if `getUser()` returns no user; rendered in cold-start layout
  - [ ] Fetch first card immediately: `getFirstDueCard(coldStartDeckId)` — single fast DAL query
  - [ ] Render `<FlashCard>` immediately (first card < 1s NFR-PERF4)
  - [ ] Wrap remaining `<StudyQueue>` in `<Suspense fallback={<QueueSkeleton />}>` for streaming
  - [ ] `COLD_START_DECK_ID` resolved by `getDeckByOwner(SYSTEM_USER_ID)` DAL call or hardcoded after seed
  - [ ] Create `src/app/cold-start/loading.tsx` skeleton

- [ ] Task 9: Create StudyQueue component (AC: #3)
  - [ ] Create `src/components/study/StudyQueue.tsx`
  - [ ] Fetches all cards for deck via DAL, hydrates Zustand store
  - [ ] Streams remaining cards via Suspense
  - [ ] Manages card progression (nextCard on rate)
  - [ ] Empty state: if `findCardsByDeckId` returns 0 cards, render `<SessionComplete ratings={[]} />` rather than an infinite spinner or crash
  - [ ] Bounds check: guard `cards[currentIndex]` access — if `currentIndex >= cards.length`, render `<SessionComplete>` (isComplete derived state)
  - [ ] StudyQueue must take ownership of ALL cards including the first one — replace the RSC-rendered FlashCard shell once hydrated so the first card's rating is captured by the live `rateAnonymousCard` Server Action

- [ ] Task 10: Create SessionComplete screen (AC: #4)
  - [ ] Create `src/components/study/SessionComplete.tsx`
  - [ ] Shows completion summary (cards reviewed, basic stats)
  - [ ] CTA: "Sign up to save progress" → links to `/signup`
  - [ ] CTA: "Explore more decks" → links to `/signup`
  - [ ] Ratings are written to DB per-card via `rateAnonymousCard` Server Action (Task 12) — NOT deferred to Story 1.6
  - [ ] SessionComplete shows summary from Zustand store (already persisted to DB card-by-card)
  - [ ] Story 1.6 upgrade transfers the already-persisted DB rows by updating `user_id` — it does not re-submit ratings

- [ ] Task 11: Create DAL functions for cold start
  - [ ] Add `getSystemDeck()` to `src/server/db/queries/decks.ts` — returns deck owned by SYSTEM_USER_ID
  - [ ] Add `getFirstDueCard(deckId)` to `src/server/db/queries/cards.ts` — single card fetch, ordered by `createdAt ASC` for deterministic first-card (no pagination)
  - [ ] Add `findCardsByDeckId(deckId, pagination)` — for StudyQueue streaming

- [ ] Task 12: Create anonymous review write path (AC: #3)
  - [ ] Add `createAnonymousReview(anonUserId, cardId, rating, deckId)` to `src/server/db/queries/reviews.ts`
  - [ ] INSERT into `reviews`: `userId = anonUserId`, `cardId`, `rating`, `deckId`; omit `presentationMode` and `responseTimeMs` (behavioral signals not stored for anonymous)
  - [ ] Create `rateAnonymousCard(cardId, rating, deckId)` Server Action in `src/app/cold-start/actions.ts`
  - [ ] **Security:** derive `userId` from `supabase.auth.getUser()` inside the Server Action — never accept `userId` as a caller parameter (prevents a client from writing ratings to another user's ID)
  - [ ] Call this Server Action from `RatingButtons` (or from `StudyQueue`) after each card rating
  - [ ] This ensures ratings exist in DB before Story 1.6 upgrade — Zustand store is ephemeral
  - [ ] Handle DB insert failure in `rateAnonymousCard`: return `Result<null, error>`; in the client caller show a non-blocking toast "Your rating was not saved — check your connection" and still advance the card (do not block study progress on a failed write)

- [ ] Task 13: E2E tests (Playwright)
  - [ ] Create `tests/e2e/cold-start.spec.ts`
  - [ ] Test: anonymous visitor can load cold start page without login
  - [ ] Test: first card renders in < 1 second (NFR-PERF4)
  - [ ] Test: card flip interaction works (click to reveal back)
  - [ ] Test: rating buttons appear after flip
  - [ ] Test: all 10 cards can be progressed through
  - [ ] Test: completion screen with signup CTA appears after all cards rated
  - [ ] Run `axe-playwright` on cold start page (ARCH16)

## Dev Notes

### New Packages This Story

```bash
npx shadcn@latest init          # shadcn/ui — THIS story is first visible UI
pnpm add framer-motion          # card flip animation ONLY — no other animations
```

**shadcn/ui init:** Run `npx shadcn@latest init` and accept defaults. Then add the components needed by this and upcoming stories:
```bash
npx shadcn@latest add button input form checkbox label
```
`src/components/ui/` is auto-managed — do NOT edit these files manually.

**Framer Motion constraint:** Used ONLY for card flip (`transform-style: preserve-3d`, rotateY animation). All other animations use Tailwind `transition-*` utilities. No exceptions — bundle consistency is a hard rule.

### FlashCard Component — Mode Prop Strategy

```typescript
// src/components/study/FlashCard.tsx
'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import type { CardMode } from '@/types'

interface CardWithSchedule {
  id: string
  front: string
  back: string
  mode: CardMode
  imageUrl: string | null
  narrativeContext: string | null
}

type Rating = 1 | 2 | 3 | 4

interface FlashCardProps {
  card: CardWithSchedule
  mode: CardMode          // determined by learning fingerprint (or default 'qa' for cold start)
  onRate: (rating: Rating) => void
}

export function FlashCard({ card, mode, onRate }: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  const getFrontContent = () => {
    switch (mode) {
      case 'image':
        // Never render <img src=""> — fires a request to the page URL; fall back to text instead
        if (!card.imageUrl) return <p className="text-xl font-medium text-gray-900">{card.front}</p>
        return <img src={card.imageUrl} alt={card.front} className="w-full rounded" />
      case 'context-narrative':
        // Never render empty italic paragraph; fall back to front text
        if (!card.narrativeContext) return <p className="text-xl font-medium text-gray-900">{card.front}</p>
        return <p className="text-gray-700 italic">{card.narrativeContext}</p>
      default:
        return <p className="text-xl font-medium text-gray-900">{card.front}</p>
    }
  }

  const getBackContent = () => (
    <p className="text-xl text-gray-900">{card.back}</p>
  )

  return (
    <div className="relative w-full max-w-2xl mx-auto" style={{ perspective: '1000px' }}>
      <motion.div
        className="relative w-full min-h-64 cursor-pointer"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.4 }}
        onClick={() => !isFlipped && setIsFlipped(true)}
      >
        {/* Front */}
        <div className="absolute inset-0 flex items-center justify-center p-8 bg-white rounded-xl shadow-md" style={{ backfaceVisibility: 'hidden' }}>
          {getFrontContent()}
          {!isFlipped && <p className="absolute bottom-4 text-sm text-gray-400">Click to reveal</p>}
        </div>
        {/* Back */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-md" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          {getBackContent()}
        </div>
      </motion.div>
      {isFlipped && <RatingButtons onRate={onRate} />}
    </div>
  )
}
```

**Import rule:** `CardMode` MUST be imported from `@/types` — never from `@/server/db/schema`.

### Study Session Zustand Store

```typescript
// src/stores/study-session.ts
'use client'
import { create } from 'zustand'
import type { CardMode } from '@/types'

interface CardReview {
  cardId: string
  rating: 1 | 2 | 3 | 4
  responseTimeMs: number
  presentationMode: CardMode
}

interface StudySessionState {
  cards: CardWithSchedule[]
  currentIndex: number
  ratings: CardReview[]
  cardDisplayedAt: number | null
  setCards: (cards: CardWithSchedule[]) => void
  rateCard: (cardId: string, rating: 1 | 2 | 3 | 4, mode: CardMode) => void
  nextCard: () => void
  reset: () => void
}

export const useStudySessionStore = create<StudySessionState>((set, get) => ({
  cards: [],
  currentIndex: 0,
  ratings: [],
  cardDisplayedAt: null,

  setCards: (cards) => set({ cards, currentIndex: 0, cardDisplayedAt: Date.now() }),

  rateCard: (cardId, rating, mode) => {
    const responseTimeMs = Date.now() - (get().cardDisplayedAt ?? Date.now())
    set((s) => ({
      ratings: [...s.ratings, { cardId, rating, responseTimeMs, presentationMode: mode }],
    }))
  },

  nextCard: () => set((s) => ({ currentIndex: s.currentIndex + 1, cardDisplayedAt: Date.now() })),

  reset: () => set({ cards: [], currentIndex: 0, ratings: [], cardDisplayedAt: null }),
}))
```

**CRITICAL — anonymous session constraint:** For anonymous study sessions, `presentationMode` and `responseTimeMs` are captured in the store but **NOT written to the DB**. Only `cardId` and `rating` are persisted for anonymous users. Behavioral profiling signals begin accumulating from the first authenticated session (per GDPR legitimate interest basis).

### RSC Streaming Pattern for < 1s First Card (NFR-PERF4)

```typescript
// src/app/cold-start/page.tsx
import { Suspense } from 'react'
import { FlashCard } from '@/components/study/FlashCard'
import { StudyQueue } from '@/components/study/StudyQueue'
import { createUserClient } from '@/lib/supabase/user'
import { getSystemDeck, getFirstDueCard } from '@/server/db/queries'

export default async function ColdStartPage() {
  // Anonymous session is initialized by <AnonymousSessionInitializer /> client component
  // RSC only reads existing session — never calls signInAnonymously() server-side
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  const deckResult = await getSystemDeck()
  if (deckResult.error) return <p>Deck not available</p>

  const firstCardResult = await getFirstDueCard(deckResult.data.id)
  if (firstCardResult.error) return <p>No cards available</p>

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* NOTE: This first FlashCard is a server-rendered shell for immediate display only.
          StudyQueue (loaded via Suspense) takes full ownership of card progression including
          the first card — it re-renders the first card with a live onRate handler once hydrated.
          The shell's onRate={() => {}} is intentionally a no-op; StudyQueue replaces it. */}
      <FlashCard card={firstCardResult.data} mode="qa" onRate={() => {}} />
      <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded mt-4" />}>
        <StudyQueue deckId={deckResult.data.id} />
      </Suspense>
    </main>
  )
}
```

**Why this achieves < 1s:** `getFirstDueCard` is a single indexed query. The page renders the first FlashCard synchronously. The rest of the queue streams via Suspense without blocking the first card display.

### AnonymousSessionInitializer — Client Component (replaces server-side signInAnonymously)

```typescript
// src/components/shared/AnonymousSessionInitializer.tsx
'use client'
import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// Module-level flag prevents concurrent double sign-in (React StrictMode or rapid re-mounts)
// Flag guards only the signInAnonymously call — getUser() is always checked first so existing
// sessions (e.g., user navigates away and back) are detected without needing to re-init.
let anonInitStarted = false

export function AnonymousSessionInitializer() {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) { console.error('[AnonymousSessionInitializer] Missing Supabase env vars'); return }

    const supabase = createBrowserClient(url, key)
    // Always call getUser() first — if user already exists (from prior nav or restored session), skip init
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        // No session — guard here (not at top of effect) to still detect existing sessions on re-entry
        if (anonInitStarted) return
        anonInitStarted = true
        supabase.auth.signInAnonymously().catch((err) => {
          console.error('[AnonymousSessionInitializer] signInAnonymously failed:', err)
          anonInitStarted = false // allow retry on next mount
        })
      }
    })
  }, [])

  return null
}
```

**Why Client Component:** `signInAnonymously()` sets a session cookie. Next.js Server Components cannot set cookies during rendering — only route handlers and Server Actions can. A Client Component using `useEffect` runs after hydration in the browser, where cookie-setting works correctly. Render `<AnonymousSessionInitializer />` in `src/app/cold-start/layout.tsx` so it fires on every cold-start route.

### Seed Data Addition for Cold Start Deck

```sql
-- supabase/seed.sql — APPEND after system user section from Story 1.2
-- Cold Start Deck: "5 Science-Backed Memory Techniques"
-- Run AFTER system user is seeded. Replace $SYSTEM_USER_ID with actual UUID.

INSERT INTO decks (id, title, owned_by, created_at)
VALUES (gen_random_uuid(), '5 Science-Backed Memory Techniques', (SELECT id FROM auth.users WHERE email = 'system@internal.flashcards.app'), now())
ON CONFLICT DO NOTHING;

-- 10 cards: at least 2 qa, 2 image, 2 context-narrative
-- (insert cards referencing the deck id above)
-- See seed.sql in repo for full card data
```

**`getSystemDeck()` must be cached** — it is called on every cold-start page load and the system deck never changes. Wrap with `next/cache` `unstable_cache`:

```typescript
import { unstable_cache } from 'next/cache'
import { db } from '@/server/db'

export const getSystemDeck = unstable_cache(
  async () => {
    // Resolve system user ID from system_config table — avoids hardcoding UUIDs or env vars in queries
    const config = await db.query.systemConfig.findFirst({ where: eq(systemConfig.id, 'global') })
    if (!config?.systemUserId) return { data: null, error: { message: 'System user not configured', code: 'NOT_FOUND' } }

    const deck = await db.query.decks.findFirst({
      where: eq(decks.ownedBy, config.systemUserId),
    })
    if (!deck) return { data: null, error: { message: 'System deck not found', code: 'NOT_FOUND' } }
    return { data: deck, error: null }
  },
  ['system-deck'],
  { tags: ['system-deck'], revalidate: 3600 }
  // Call revalidateTag('system-deck') after re-seeding to clear stale cache immediately
)
```
Add `COLD_START_DECK_ID` to `.env.example` as a comment-only entry (optional override; runtime lookup is preferred).

### File Structure for This Story

New files:
```
src/
  app/
    cold-start/
      layout.tsx                  ← NEW: renders <AnonymousSessionInitializer />
      page.tsx                    ← NEW: RSC, anonymous study entry point
      loading.tsx                 ← NEW: skeleton fallback
  components/
    shared/
      AnonymousSessionInitializer.tsx  ← NEW: Client Component, calls signInAnonymously() on mount
    study/
      FlashCard.tsx               ← NEW: mode prop strategy, Framer Motion flip
      RatingButtons.tsx           ← NEW: FSRS 1–4 rating buttons
      StudyQueue.tsx              ← NEW: Suspense-streamed card queue
      SessionComplete.tsx         ← NEW: completion screen + signup CTA
  stores/
    study-session.ts              ← NEW: ephemeral session store (no persist)
  hooks/
    useStudySession.ts            ← NEW: wraps store, returns derived state

Modified files:
  supabase/seed.sql               ← MODIFY: add cold start deck + 10 cards
  supabase/migrations/rls/decks_rls.sql  ← MODIFY: add system user deck read access
  supabase/migrations/rls/cards_rls.sql  ← MODIFY: add system user cards read access
  src/server/db/queries/decks.ts  ← MODIFY: add getSystemDeck()
  src/server/db/queries/cards.ts  ← MODIFY: add getFirstDueCard(), findCardsByDeckId()
  .env.example                    ← MODIFY: add COLD_START_DECK_ID
```

### Architecture Compliance Checklist (Anti-Disaster)

- [ ] `CardMode` imported from `@/types` — NEVER from `@/server/db/schema`
- [ ] Single `<FlashCard>` with `mode` prop — no separate QACard/ImageCard/NarrativeCard
- [ ] Framer Motion used ONLY for card flip — no other animations in this story
- [ ] Study session store does NOT use `persist` middleware — ephemeral only
- [ ] Anonymous sessions: `presentationMode` + `responseTimeMs` captured in store but NOT written to DB
- [ ] FSRS card ratings ARE written to DB for anonymous sessions (same as authenticated)
- [ ] RSC page fetches first card synchronously — `<Suspense>` wraps only the queue
- [ ] Ratings written to DB per-card via `rateAnonymousCard` Server Action (Task 12) — `SessionComplete` reads from Zustand for display only, not as primary data store
- [ ] Story 1.6 transfers already-persisted DB rows by updating `user_id` — it does NOT re-submit ratings from Zustand
- [ ] System user deck seed: `ON CONFLICT DO NOTHING` for idempotency
- [ ] shadcn/ui `npx shadcn@latest init` run ONCE in this story — `src/components/ui/` is auto-managed

### Previous Story (1.3) Intelligence

Story 1.3 established:
- `src/stores/cookie-consent.ts` — Zustand store pattern established; use same `create()` pattern
- `src/hooks/useCookieConsent.ts` — hydration hook pattern established
- `'use client'` directive pattern for client components
- shadcn/ui was explicitly NOT initialized in 1.3 — **initialize it HERE**

Story 1.2 established:
- `createUserClient()` in `src/lib/supabase/user.ts` — use for anonymous sign-in
- `SYSTEM_USER_ID` env var + `validateSystemUser()` — system user exists and is validated
- `src/server/db/schema/cards.ts` — `cardModeEnum`, `cards` table with all FSRS fields
- `src/server/db/schema/decks.ts` — `decks` table
- DAL pattern: all functions in `src/server/db/queries/`, return `Result<T>`, never throw
- `seed.sql` at `supabase/seed.sql` — APPEND to it, don't replace

### Story Definition of Done

A story is complete when ALL are true:
1. **E2E tests** — Playwright: anonymous visitor loads cold start, all cards playable, signup CTA visible
2. **Performance** — First card renders in < 1 second in Playwright (NFR-PERF4)
3. **Accessibility** — `axe-playwright` passes on cold start page (ARCH16)
4. **Framer Motion** — Card flip works with `preserve-3d` animation (no jank)
5. **Anonymous GDPR** — Confirmed: `presentationMode` and `responseTimeMs` NOT in DB for anonymous sessions
6. **Seed idempotent** — Running `seed.sql` twice doesn't create duplicate decks/cards

### References

- Cold Start → Auth Handoff: `_bmad-output/planning-artifacts/architecture.md`
- Study session RSC streaming pattern: architecture.md (study session section)
- FlashCard mode prop pattern: architecture.md (FR25)
- CardMode enum: `_bmad-output/planning-artifacts/architecture.md#Data Architecture`
- NFR-PERF4: first card < 1 second
- ARCH16: `axe-playwright` for accessibility
- Framer Motion: card flip only (architecture.md constraint)
- Previous story: `_bmad-output/implementation-artifacts/1-3-cookie-consent-banner-and-gdpr-consent-storage.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
