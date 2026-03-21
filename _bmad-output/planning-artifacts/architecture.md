---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-20'
inputDocuments:
  - _bmad-output/A-Product-Brief/project-brief.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/research/technical-flashcards-saas-stack-research-2026-03-20.md
workflowType: 'architecture'
project_name: 'Flashcards'
user_name: 'Jani'
date: '2026-03-20'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
62 FRs across 8 categories: Discovery & Onboarding (FR1–4), Auth & Account Management (FR5–13), Deck & Card Management (FR14–19), Study & Learning Engine (FR20–26), AI & Personalization (FR27–36), Payments & Subscriptions (FR37–41), Team & B2B Workspace (FR42–49), Administration & Compliance (FR50–62).

Core architectural demands: cold start anonymous experience with auth transition, FSRS-6 scheduling requiring notes/cards/reviews separation, AI generation pipeline with rate limiting and fallback, and Stripe subscription tier enforcement via RLS.

**Non-Functional Requirements:**
- Performance: LCP < 2s (4G), API p95 < 500ms, AI generation < 5s/card or < 15s/20-card deck, study first card < 1s
- Security: Supabase RLS on all tables, server-side-only AI/payment calls, no PII in AI prompts, short-lived JWTs with rotation, brute-force rate limiting
- Privacy/GDPR: EU data residency (Frankfurt), 30-day deletion SLA, 72-hour data export SLA, functional-only cookies until consent
- Reliability: 99.5% uptime, zero study session data loss tolerance, idempotent Stripe webhooks, AI fallback (gpt-4o-mini → gpt-4o, all Azure)
- Accessibility: WCAG 2.1 AA on all core flows

**Scale & Complexity:**
- Primary domain: EdTech consumer SaaS with lightweight B2B layer
- Complexity level: Medium
- Estimated architectural components: 8–10 major (auth, deck management, study engine, AI pipeline, Learning Fingerprint, team workspace, payments, admin, analytics, GDPR tooling)

### Technical Constraints & Dependencies

- **Solo developer** — monorepo required; no microservices; maximize Supabase built-ins (auth, storage, edge functions, RLS)
- **Stack locked** — Next.js App Router + Supabase + Vercel + Stripe + Azure OpenAI (all LLM calls) + Resend
- **AI models** — Azure OpenAI, Sweden Central region (EU Data Zone, only EU region supporting GPT-5 series):
  - `gpt-4o-mini` — card generation (fast, cheap, structured output)
  - `gpt-5.4-mini` — long document ingestion (400K context)
  - `gpt-4o` — fallback if primary deployment unavailable
  - `gpt-4o-mini-tts` + `gpt-4o-transcribe` — Phase 2 audio cards
- **ORM** — Drizzle (type-safe, edge-friendly, SQL-close)
- **AI abstraction** — Vercel AI SDK (`@ai-sdk/azure`) with `generateObject()` / `streamObject()` + Zod
- **SRS library** — `ts-fsrs` (official TypeScript FSRS-6 implementation)
- **Infrastructure** — $0/month at launch; scale trigger at MRR > $200/mo (Supabase Pro $25 + Vercel Pro $20)
- **Data residency** — Supabase: EU Frankfurt; Azure OpenAI: Sweden Central (both satisfy GDPR EU data residency)

### Cross-Cutting Concerns Identified

1. **Authentication & RBAC** — 5-tier role model enforced via Supabase RLS across every data access; subscription state must stay in sync with role grants
2. **GDPR compliance** — Touches auth, storage, AI pipeline, analytics, and deletion/export flows; must be designed in, not bolted on
3. **AI cost control** — Per-user rate limiting, admin spend toggle, tier-based access, and Azure→Gemini fallback span auth, AI pipeline, and admin layers
4. **Study data integrity** — Zero data loss on session completion; local state sync pattern required (offline-tolerant write)
5. **Cold start → auth handoff** — Anonymous session state (Learning Fingerprint signals, deck progress) must transfer to authenticated user without friction
6. **Runtime configuration** — Feature flags (`ai_free_tier_enabled`, future A/B flags) must be mutable without deployment via Supabase `system_config` table

## Starter Template Evaluation

### Primary Technology Domain

Full-stack SaaS web application — Next.js App Router with Supabase backend, AI integration layer, and Stripe billing.

### Starter Options Considered

- **dzlau/stripe-supabase-saas-template** (212★) — Includes Drizzle + Supabase + Stripe + shadcn, but low community validation and missing Vercel AI SDK, ts-fsrs, Resend, and GDPR patterns
- **KolbySisk/next-supabase-stripe-starter** (757★) — Mature, includes Resend and shadcn, but uses raw Supabase migrations (no Drizzle), missing AI SDK layer
- **create-t3-app** (16k★) — Most popular, optional Drizzle + Tailwind, but no Supabase or Stripe; tRPC adds complexity not needed in an App Router project
- **vercel/nextjs-subscription-payments** — Archived Jan 2025, avoid

### Selected Approach: Custom scaffold via `create-next-app`

**Rationale:** No existing starter covers the full required stack (Drizzle + Supabase + Stripe + Vercel AI SDK + ts-fsrs + Resend). Inheriting a partial starter's structural assumptions on a carefully-designed architecture would create friction. Clean scaffold + deliberate layer-by-layer addition ensures every decision matches the architecture document.

**Initialization Command:**

```bash
npx create-next-app@latest flashcards \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --turbopack
```

**Architectural Decisions Provided by Scaffold:**

**Language & Runtime:**
TypeScript strict mode; Node.js runtime; App Router (RSC-first)

**Styling Solution:**
Tailwind CSS v4 (included by flag); shadcn/ui added post-scaffold via `npx shadcn@latest init`

**Build Tooling:**
Turbopack (dev), Next.js production build (Vercel optimized), ESLint flat config

**Testing Framework:**
Not included by default — Vitest + Playwright added as first-story dependency

**Code Organization:**
`src/` directory with App Router conventions:
- `src/app/` — routes, layouts, pages
- `src/components/` — shared UI components
- `src/lib/` — utilities, Supabase client, Drizzle schema
- `src/server/` — server-only logic (AI calls, Stripe, Drizzle queries)

**Post-scaffold layer additions (in order):**
1. Supabase (`pnpm add @supabase/supabase-js @supabase/ssr`) + Drizzle (`pnpm add drizzle-orm drizzle-kit`)
2. Vercel AI SDK (`pnpm add ai @ai-sdk/azure`)
3. ts-fsrs (`pnpm add ts-fsrs`)
4. Stripe (`pnpm add stripe @stripe/stripe-js`)
5. Resend (`pnpm add resend`)
6. shadcn/ui (`npx shadcn@latest init`)
7. Vitest + Playwright (testing)
8. Zod (`pnpm add zod`) — already peer dep of AI SDK

**Note:** Project initialization using this command is the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data schema: decks → notes → cards → reviews hierarchy
- Auth: Supabase anonymous sessions with `linkIdentity()` upgrade
- Drizzle ORM wrapper pattern (no raw SQL in app code)
- RLS role enforcement via `profiles.tier` synced by Stripe webhook
- Server Actions + Route Handlers split

**Important Decisions (Shape Architecture):**
- Zustand for study session state; local-first with DB sync on completion
- Result type error handling pattern throughout DAL
- Streaming AI generation for full decks; request/response for single cards
- Sentry + structured JSON logging for observability
- Vercel KV + Upstash for rate limiting

**Deferred Decisions (Post-MVP):**
- PWA / service worker (offline capability)
- Native mobile architecture
- Redis beyond rate limiting (caching layer)

### Data Architecture

**Schema Design** — `decks → notes → cards → reviews` hierarchy.
Separate content (notes) from scheduling state (cards). One note generates multiple cards per modality, each with an independent FSRS-6 schedule.

Supporting tables:
- `profiles` — user tier, display name, GDPR consent state
- `user_fsrs_params` — 21-weight array per user (Learning Fingerprint)
- `system_config` — runtime feature flags (`ai_free_tier_enabled`, etc.)
- `teams`, `team_members` — lightweight multi-tenancy
- `ai_usage` — per-user monthly generation count for free tier enforcement

**Migration Approach** — Drizzle Kit for all schema migrations (`drizzle-kit generate` + `drizzle-kit migrate`). RLS policies defined as SQL files in `/supabase/migrations/rls/` (infrastructure config, version-controlled but outside Drizzle). No raw SQL in application code.

**Data Access Layer** — All DB interactions through typed Drizzle wrapper functions in `src/server/db/queries/` (e.g. `getDecksForUser()`, `createCard()`, `recordReview()`). Route handlers and Server Actions call these wrappers only — never Drizzle directly.

**Caching** — Next.js `unstable_cache` / `revalidateTag` for cacheable reads (deck lists, system config). No additional Redis cache at MVP. Study session data always fetched fresh (zero stale-state risk).

### Authentication & Security

**Session Handling** — Supabase SSR (`@supabase/ssr`) with HTTP-only cookies. No localStorage for auth tokens. Works natively with Next.js App Router RSCs and Server Actions.

**Cold Start → Auth Handoff** — Supabase anonymous sign-in on first cold start deck load. Anonymous session accumulates Learning Fingerprint signals server-side. On signup, `supabase.auth.linkIdentity()` upgrades the anonymous session to a real account — all data preserved, no localStorage fragility, GDPR-compliant.

**RBAC Enforcement** — `profiles.tier` column stores active subscription role (`anonymous | free | pro | team_member | team_admin`). Stripe webhook handler updates this column on subscription events. Supabase RLS policies reference `profiles.tier` via `auth.uid()` join — no client-side trust.

**Rate Limiting** — Vercel KV + `@upstash/ratelimit`. Applied at:
- Auth endpoints: 10 attempts / 15 min per IP (NFR brute-force requirement)
- AI generation: per-user monthly count enforced via `ai_usage` table + Upstash sliding window for burst protection
- Team invite sends: rate-limited to prevent abuse (FR52)

### API & Communication Patterns

**API Layer** — Server Actions for all internal mutations (deck CRUD, card ratings, AI generation triggers, subscription management). Route Handlers (`/api/`) only for: Stripe webhooks, Resend webhooks, and any future third-party callbacks. Minimizes API surface for solo dev maintainability.

**AI Generation** — `streamObject()` (Vercel AI SDK `@ai-sdk/azure`) for full deck generation (20 cards, ≤15s) with progressive card display. `generateObject()` for single card operations (≤5s). All models are Azure OpenAI deployments (Sweden Central — EU Data Zone):
- Short generation (topic/paste ≤20 cards): `gpt-4o-mini` deployment
- Long document ingestion (large PDF/paste): `gpt-5.4-mini` deployment (400K context)
- Automatic fallback on timeout/error: `gpt-4o` deployment (same Azure resource)
- Learning Fingerprint analysis: `gpt-4o-mini` deployment

All AI calls server-side only — API keys never reach the client.

**Error Handling** — `Result` type pattern `{ data: T | null, error: string | null }` returned from all DAL wrapper functions and Server Actions. No thrown exceptions in business logic. Errors are explicit, typed, and propagated deliberately. Sentry captures unhandled exceptions at the boundary.

### Frontend Architecture

**State Management:**
- Server state: RSC + `revalidatePath` / `revalidateTag` (no client fetching library needed)
- Study session state: Zustand store (card queue, current card, ratings buffer, session timer)
- Simple UI state (cookie consent, modals): React Context
- No global state for server data

**Study Session — Local-First:**
Card ratings accumulated in Zustand store during session. Single Drizzle batch write via Server Action on session completion. `beforeunload` handler fires a `navigator.sendBeacon` to persist partial progress if tab closes mid-session. Zero data loss tolerance met without per-card round trips.

**Component Organization:**
- `src/components/ui/` — shadcn/ui primitives (auto-generated, do not edit manually)
- `src/components/` — composed application components
- `src/app/` — route-colocated page components, layouts, loading/error boundaries

### Infrastructure & Deployment

**CI/CD** — Vercel Git integration: push to `main` → production deploy; feature branches → preview deployments with unique URLs. Husky pre-push hook runs `tsc --noEmit` + ESLint locally before push. No separate GitHub Actions pipeline at MVP.

**Environments:**
- Local: `.env.local` + `supabase start` (local Docker instance via Supabase CLI)
- Preview: Vercel preview deployments + shared staging Supabase project
- Production: Vercel (EU-optimized) + Supabase Frankfurt (EU data residency)

**Observability:**
- Sentry (free tier, Vercel integration) — error capture, alerting on critical events (payment failures, auth failures) within 5 min (NFR)
- Structured JSON logging (FR54–57) — `console.log` with JSON shape `{ action, userId, role, timestamp, error?, stack? }` — queryable via Vercel Log Drains and admin dashboard

### Decision Impact Analysis

**Implementation Sequence:**
1. Scaffold (`create-next-app`) + Supabase local setup
2. Drizzle schema + RLS SQL files
3. Supabase Auth + anonymous session + `profiles.tier`
4. Vercel KV + Upstash rate limiting
5. Drizzle DAL wrapper functions
6. Server Actions pattern + Result type
7. Stripe integration + webhook + tier sync
8. AI pipeline (Vercel AI SDK + streaming)
9. ts-fsrs + study session (Zustand local-first)
10. Sentry + structured logging

**Cross-Component Dependencies:**
- RLS policies depend on `profiles.tier` → Stripe webhook must be implemented before any tier-gated feature
- Anonymous session pattern must be in place before cold start deck
- DAL wrappers must exist before any Server Action can touch the DB
- AI pipeline requires rate limiting to be in place before free tier AI access is enabled

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

42 pattern rules across 8 categories prevent AI agent implementation divergence:
naming, structure, data access, auth/security, API communication, frontend, infrastructure, and story DoD.

### Naming Patterns

**Database Naming (PostgreSQL / Drizzle):**
- Tables: `snake_case` plural — `decks`, `notes`, `cards`, `reviews`, `user_fsrs_params`, `team_members`
- Columns: `snake_case` — `user_id`, `deck_id`, `created_at`, `front_text`
- Foreign keys: `{table_singular}_id` — `deck_id`, `note_id`, `user_id`
- Indexes: `idx_{table}_{column(s)}` — `idx_cards_user_due`
- Booleans: affirmative names — `is_active`, `has_completed`; NOT `not_deleted`
- Timestamps: always `TIMESTAMPTZ`; suffix `_at` — `created_at`, `reviewed_at`, `deleted_at`

**File & Directory Naming:**
- Component files: `PascalCase.tsx` — `DeckCard.tsx`, `StudySession.tsx`
- Non-component files: `kebab-case.ts` — `get-decks.ts`, `stripe-webhook.ts`
- Directories: `kebab-case` — `src/server/db/queries/`, `src/components/deck/`
- Test files: co-located `{filename}.test.ts` — `get-decks.test.ts`
- Server Action files: `actions.ts` co-located with route by default; move to `src/server/actions/{feature}.ts` only when genuinely shared across multiple routes

**Code Naming Conventions:**
- Components: `PascalCase` — `DeckCard`, `StudySessionCard`
- Functions: `camelCase` — `getDecksForUser()`, `recordReview()`
- Constants: `SCREAMING_SNAKE_CASE` — `MAX_FREE_GENERATIONS`, `FSRS_DEFAULT_RETENTION`
- Types/interfaces: `PascalCase` — `DeckWithCards`, `StudySessionState`
- Zustand stores: `use{Name}Store` — `useStudySessionStore`, `useCookieConsentStore`

**DAL Function Verb Conventions:**
- `find*` — list queries returning arrays: `findDecksByUserId()`, `findCardsDue()`
- `get*` — single record fetches: `getDeckById()`, `getUserProfile()`
- `create*` — insert operations: `createDeck()`, `createNote()`
- `update*` — update operations: `updateCardSchedule()`, `updateProfileTier()`
- `delete*` — delete operations: `deleteDeck()`, `deleteReviewsByUser()`

### Structure Patterns

**Project Organization:**
```
src/
  app/
    (auth)/                     # Auth pages (login, signup, reset)
    (marketing)/                # Public/landing pages
    (app)/                      # Authenticated app routes
      dashboard/
      decks/[deckId]/study/
      team/
      settings/
    api/                        # Route Handlers — webhooks only
      stripe/webhook/
      resend/webhook/
  components/
    ui/                         # shadcn/ui primitives — DO NOT edit
    deck/                       # Deck-specific components
    study/                      # Study session components
    team/                       # Team workspace components
    shared/                     # App-wide shared components
  server/
    db/
      schema/                   # Drizzle schema + relations (one file per domain)
        decks.ts                # includes deckRelations export
        notes.ts
        cards.ts
        reviews.ts
        users.ts
        teams.ts
      queries/                  # DAL wrapper functions (one file per domain)
        decks.ts
        cards.ts
        reviews.ts
        users.ts
        teams.ts
      index.ts                  # Drizzle client + re-exports schema and relations
    actions/                    # Shared Server Actions (only when used across routes)
    ai/                         # AI pipeline logic
    fsrs/
      index.ts                  # Exports scheduleCard() and initializeCard() only
    email/
      templates/                # React Email components
        InviteEmail.tsx
        ReEngagementEmail.tsx
        ReceiptEmail.tsx
      index.ts                  # sendEmail() wrapper
  lib/
    supabase/
      server.ts                 # createServerClient() — service role, admin only
      user.ts                   # createUserClient(session) — anon key, all app queries
    logger.ts                   # Typed log() wrapper enforcing JSON shape
    analytics.ts                # trackEvent(name: AppEvent, properties) wrapper
    constants.ts                # App-wide constants
    validators/                 # Zod schemas by feature
  types/
    index.ts                    # All named types (Drizzle inferred + custom)
    errors.ts                   # Centralized error code registry
  hooks/                        # Client-side React hooks
  stores/                       # Zustand stores
supabase/
  migrations/                   # Drizzle-generated schema migrations
  migrations/rls/               # RLS policy SQL files (version-controlled)
  seed.sql
```

**Drizzle Relations — co-location rule:**
Relations are defined in the same file as their primary table and exported as `{table}Relations`. `src/server/db/index.ts` re-exports both schema tables and relations for the Drizzle client. Agents must never define relations in a separate file.

**Drizzle Config — casing:**
```typescript
// drizzle.config.ts
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema',
  out: './supabase/migrations',
  casing: 'camelCase', // snake_case in DB → camelCase in TypeScript automatically
})
```

### Format Patterns

**Result Type — canonical definition and location:**
```typescript
// src/types/index.ts — single source of truth
export type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string; code?: string } }
```
All DAL functions and Server Actions return `Result<T>`. Never throw across these boundaries.

**Error Code Registry:**
```typescript
// src/types/errors.ts
export const ErrorCodes = {
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
  CONTENT_POLICY_VIOLATION: 'CONTENT_POLICY_VIOLATION',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  STRIPE_WEBHOOK_DUPLICATE: 'STRIPE_WEBHOOK_DUPLICATE',
} as const
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]
```
Client branches on `result.error?.code` for different UI treatments (upgrade modal, retry, etc).

**TypeScript Type Strategy:**
All Drizzle-inferred types are re-exported as named types from `src/types/index.ts`:
```typescript
import { decks, notes, cards, reviews } from '@/server/db/schema/...'
export type Deck = typeof decks.$inferSelect
export type NewDeck = typeof decks.$inferInsert
export type Card = typeof cards.$inferSelect
```
Components and Server Actions import from `@/types` — never from `@/server/db/schema` directly.

**Date/Time Format:**
- DB: `TIMESTAMPTZ` always
- API/JSON: ISO 8601 strings — `"2026-03-20T10:00:00.000Z"`
- UI display: `Intl.DateTimeFormat` — never hardcode locale

**JSON Field Naming:**
- DB columns: `snake_case` (Drizzle schema)
- TypeScript/client: `camelCase` (Drizzle `casing: 'camelCase'` handles mapping)

### Communication Patterns

**Logging — typed wrapper:**
```typescript
// src/lib/logger.ts
interface LogEntry {
  action: string        // dot-notation: 'ai.generate.deck', 'stripe.webhook.received'
  userId?: string
  role?: string
  timestamp: string
  durationMs?: number
  error?: string
  stack?: string
  [key: string]: unknown
}
export function log(entry: LogEntry) {
  console.log(JSON.stringify({ ...entry, timestamp: new Date().toISOString() }))
}
```
All server-side events use `log()` — never raw `console.log(JSON.stringify(...))`.

**Analytics — typed event tracking:**
```typescript
// src/lib/analytics.ts
type AppEvent =
  | 'cold_start_viewed' | 'signup' | 'deck_created'
  | 'ai_generation_used' | 'study_session_completed'
  | 'paywall_hit' | 'upgrade' | 'team_created' | 'deck_assigned'

export function trackEvent(name: AppEvent, properties: Record<string, unknown>) {
  // Vercel Analytics + structured log
}
```
`trackEvent()` is called from Server Actions after successful operations corresponding to FR58 events.

**Zustand Store Pattern:**
```typescript
interface StudySessionStore {
  queue: Card[]
  currentIndex: number
  ratings: Rating[]
  startedAt: Date | null
  initSession: (cards: Card[]) => void
  rateCard: (rating: Rating) => void
  getSessionResult: () => SessionResult  // returns data; component calls Server Action
  reset: () => void
}
```
`getSessionResult()` returns data only — it does NOT call the Server Action. The component calls the Server Action with the result. One store per domain. Stores are client-only — never imported in Server Components or DAL.

**Server Action invocation pattern:**
```typescript
const result = await createDeckAction(input)
if (result.error) {
  if (result.error.code === ErrorCodes.RATE_LIMIT_EXCEEDED) {
    openUpgradeModal()
  } else {
    toast.error(result.error.message)
  }
  return
}
// use result.data
```

### Process Patterns

**Canonical Server Action — end-to-end example:**
```typescript
// src/app/(app)/decks/actions.ts
'use server'
import { z } from 'zod'
import { createDeck } from '@/server/db/queries/decks'
import { trackEvent } from '@/lib/analytics'
import { log } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import type { Result } from '@/types'
import type { Deck } from '@/types'

const CreateDeckSchema = z.object({ title: z.string().min(1).max(100) })

export async function createDeckAction(input: unknown): Promise<Result<Deck>> {
  const parsed = CreateDeckSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: { message: 'Invalid input' } }

  const result = await createDeck({ ...parsed.data, userId: session.user.id })
  if (result.error) {
    log({ action: 'deck.create.failed', error: result.error.message })
    return result
  }

  trackEvent('deck_created', { deckId: result.data.id })
  revalidatePath('/dashboard')
  return result
}
```

**Canonical DAL Wrapper — end-to-end example:**
```typescript
// src/server/db/queries/decks.ts
import { db } from '@/server/db'
import { decks } from '@/server/db/schema/decks'
import { eq, and, isNull } from 'drizzle-orm'
import type { Result, Deck } from '@/types'

export async function findDecksByUserId(userId: string): Promise<Result<Deck[]>> {
  try {
    const data = await db.query.decks.findMany({
      where: and(eq(decks.userId, userId), isNull(decks.deletedAt)),
    })
    return { data, error: null }
  } catch (e) {
    return { data: null, error: { message: 'Failed to fetch decks' } }
  }
}
```

**Soft-Delete Pattern:**
- `deleted_at TIMESTAMPTZ` on: `profiles`, `decks`, `notes`
- Hard-delete (no soft-delete): `cards`, `reviews`, `ai_usage` — no retention value
- Cascade rule: soft-deleting a parent implicitly excludes all children — do NOT add `deleted_at` to child tables independently
- All `find*` queries include `isNull(table.deletedAt)` filter by default
- `withDeleted: boolean` parameter (default `false`) available on list queries for admin use

**FSRS Encapsulation:**
```typescript
// src/server/fsrs/index.ts — only file that imports ts-fsrs
import { fsrs, createEmptyCard, Rating } from 'ts-fsrs'
export function initializeCard() { return createEmptyCard() }
export function scheduleCard(card: FSRSCard, rating: Rating, now: Date) {
  return fsrs().repeat(card, now)[rating].card
}
```
Nothing outside `src/server/fsrs/` imports from `ts-fsrs` directly.

**Learning Fingerprint Data Flow:**
- `presentation_mode` and `response_time_ms` stored per review in `reviews` table
- At study session start: `getLearningSummary(userId)` aggregates per-modality performance from `reviews`
- Session returns `preferredMode: CardMode` — server-side calculation, not client-side preference
- `<FlashCard mode={preferredMode}>` receives the mode as a prop

**Shapeshifter Card Component:**
```typescript
// Single component with internal strategy pattern
type CardMode = 'text' | 'image' | 'context-narrative'
<FlashCard card={card} mode={preferredMode} onRate={rateCard} />
```
One `<FlashCard>` component, not separate `<TextCard>`, `<ImageCard>` components.

**Study Session — Streaming for first-card NFR (<1s):**
```tsx
// Study session page streams first card immediately via RSC
export default async function StudyPage({ params }) {
  const firstCard = await getFirstDueCard(params.deckId) // fast single query
  return (
    <>
      <FlashCard card={firstCard} />  {/* renders immediately */}
      <Suspense fallback={<QueueSkeleton />}>
        <StudyQueue deckId={params.deckId} /> {/* rest of queue streams in */}
      </Suspense>
    </>
  )
}
```

**Animation Pattern:**
- Default: CSS transitions via Tailwind `transition-*` utilities
- Card flip animation only: Framer Motion (`transform-style: preserve-3d`)
- No other animation libraries — maintain bundle consistency

**Form Handling Pattern:**
- React Hook Form + Zod resolver on client (UX validation)
- Submit as JSON to Server Action (not native FormData)
- Same Zod schema validates on server (security boundary)
- Schema defined in `src/lib/validators/{feature}.ts` — shared between client and server

**Optimistic Updates:**
- Deck creation: `useOptimistic` for immediate library update; rollback on error
- Card edits: optimistic removal with undo toast (2s window)
- Study session ratings: Zustand local-first (already defined)

**`beforeunload` Partial Session Save:**
```typescript
window.addEventListener('beforeunload', () => {
  const data = useStudySessionStore.getState().getSessionResult()
  navigator.sendBeacon('/api/session/partial',
    new Blob([JSON.stringify(data)], { type: 'application/json' })
  )
})
```
`navigator.sendBeacon` requires `Blob` with explicit content-type — never pass raw JSON string.

**GDPR Cookie Consent:**
- `useCookieConsentStore` (Zustand) tracks `analytics: boolean`
- Consent stored in `cookie-consent=granted|denied` cookie (not DB)
- `{consent.analytics && <Analytics />}` in root layout
- Banner is a Client Component in root layout — rendered server-side as shell, hydrated on client

**Reverse Paywall / Rate Limit Check:**
- Paywall checks live exclusively in Server Actions — never in components or DAL
- Check: `ai_usage.monthly_count >= FREE_TIER_LIMIT` → return `{ data: null, error: { message: '...', code: 'RATE_LIMIT_EXCEEDED' } }`
- Client: `result.error?.code === 'RATE_LIMIT_EXCEEDED'` → render upgrade modal

**System Config / Feature Flags:**
```typescript
// Cached with 5-minute TTL; revalidated on admin toggle
const getSystemConfig = unstable_cache(
  async () => db.query.systemConfig.findFirst(),
  ['system-config'],
  { revalidate: 300, tags: ['system-config'] }
)
```

**Team Query Pattern:**
All team-scoped DAL functions require both `userId` and `teamId` explicitly:
```typescript
getTeamDecks({ userId, teamId })  // both required, never optional
```
RLS is a safety net — not the primary access control in application code.

**Supabase Client Split:**
- `createServerClient()` — service role key; admin operations and migrations only
- `createUserClient(session)` — anon key + user JWT; ALL user data access in DAL
- DAL must always use `createUserClient()` — never `createServerClient()` for user data

**Middleware Auth Pattern:**
`middleware.ts` at project root:
- Handles Supabase session refresh on every request
- Redirects unauthenticated requests for `/(app)/*` routes to `/login`
- Layout components READ session data only — never re-check authentication
- One security boundary, one location

**Stripe Webhook Idempotency:**
```typescript
// Every webhook handler — check before process
const existing = await getProcessedWebhookEvent(event.id)
if (existing.data) return { data: 'already_processed', error: null }
await processEvent(event)
await recordProcessedWebhookEvent(event.id)  // atomic with process
```

**Pagination Convention — cursor-based from day one:**
```typescript
// All list DAL functions accept and return:
type PaginationInput = { limit: number; cursor?: string }
type PaginatedResult<T> = { items: T[]; nextCursor: string | null }
```
Never implement offset pagination — incompatible with cursor-based at scale.

**Email Pattern:**
```typescript
// src/server/email/index.ts
export async function sendEmail(template: ReactElement, to: string, subject: string) {
  return resend.emails.send({ from: 'noreply@...', to, subject, react: template })
}
// Usage:
await sendEmail(<InviteEmail teamName={team.name} />, member.email, 'You're invited')
```
No inline HTML strings anywhere. All templates are React Email components.

**Dynamic Import Pattern:**
```typescript
// Client Components >50KB or not needed on first paint:
const StudySession = dynamic(() => import('@/components/study/StudySession'), { ssr: false })
const AIGenerationPanel = dynamic(() => import('@/components/deck/AIGenerationPanel'), { ssr: false })
```

**Environment Variable Convention:**
- Public (client-accessible): `NEXT_PUBLIC_{SERVICE}_{KEY}` — `NEXT_PUBLIC_SUPABASE_URL`
- Private (server-only): `{SERVICE}_{KEY}` — `STRIPE_SECRET_KEY`, `AZURE_OPENAI_API_KEY`
- `.env.example` is the canonical list — agents add entries when introducing new vars

**Canonical `.env.example`:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
# Azure OpenAI (Sweden Central — EU Data Zone)
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=            # https://{resource}.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_FAST=     # gpt-4o-mini deployment name
AZURE_OPENAI_DEPLOYMENT_LARGE=    # gpt-5.4-mini deployment name (400K context)
AZURE_OPENAI_DEPLOYMENT_FALLBACK= # gpt-4o deployment name
# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# Resend
RESEND_API_KEY=
# Vercel KV (Upstash)
KV_REST_API_URL=
KV_REST_API_TOKEN=
# App
NEXT_PUBLIC_APP_URL=
```

**`next.config.ts` Canonical Section Order:**
1. `images.remotePatterns` (Supabase Storage domain)
2. `headers()` (security headers — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
3. `redirects()` (marketing redirects)
4. `experimental` (turbopack config)

**RLS Testing Rule:**
All DAL integration tests run with `createUserClient(mockSession)` — anon key + user JWT, not service role. Each list query test includes a case verifying a user cannot access another user's data.

**Testing Strategy:**
- Unit tests: pure logic — FSRS calculations, Zod validators, utility functions
- Integration tests: DAL wrappers against local Supabase (`supabase start`)
- E2E (Playwright): critical user paths — cold start, signup, deck creation, study session, upgrade flow
- Test fixtures and helpers: `src/tests/helpers/` — shared setup, not per-file

### Story Definition of Done

A story is complete when ALL of the following are true:

1. **Tests** — DAL integration tests use `createUserClient`; coverage for unauthorized access case
2. **Result type** — Server Action returns `Result<T>`; no thrown exceptions across boundaries
3. **`.env.example`** — any new environment variables added to `.env.example`
4. **Structured log** — `log()` called for any AI generation, payment, or error event
5. **Soft-delete filter** — any `find*` list query includes `isNull(table.deletedAt)`
6. **Event tracking** — `trackEvent()` called if action corresponds to an FR58 product event

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible and well-tested in combination. Next.js App Router + Supabase SSR + Drizzle is an established stack. Supabase anonymous sessions → `linkIdentity()` is supported in Supabase Auth v2+. `profiles.tier` RLS sync via Stripe webhook cleanly separates billing from access control. Zustand (client-only) + RSC (server) boundary is explicitly defined. All Azure OpenAI models are accessed via `@ai-sdk/azure` with deployment-name routing — switching models is a config change, not a code change.

**Implementation note:** `admin/actions.ts` must call `revalidateTag('system-config')` when toggling `ai_free_tier_enabled` to propagate the change within 5 minutes.

**Pattern Consistency:**
snake_case DB / camelCase TS via `casing: 'camelCase'` in `drizzle.config.ts` ✅. `Result<T>` from `src/types/index.ts` used consistently throughout DAL + Server Actions ✅. Route Handler beacon exception documented explicitly ✅. Unit tests co-located in `src/`, integration + E2E in `tests/` resolved and documented ✅.

**Structure Alignment:**
FR categories map cleanly to directory structure. Schema split into focused single-responsibility files. All integration entry points defined and bounded.

### Requirements Coverage Validation ✅

**Functional Requirements — all 62 FRs mapped:**

| Category | FRs | Coverage |
|---|---|---|
| Discovery & Onboarding | FR1–4 | `cold-start/`, `(auth)/`, Supabase anon session ✅ |
| Auth & Account Mgmt | FR5–13 | `(auth)/`, `settings/privacy/`, `settings/sessions/` ✅ |
| Deck & Card Mgmt | FR14–19 | `decks/[deckId]/` inline card management ✅ |
| Study & Learning | FR20–26 | Study route streaming, `server/fsrs/`, Zustand local-first ✅ |
| AI & Personalization | FR27–36 | `generate/`, `server/ai/sanitize.ts`, `getLearningSummary()`, `response_time_ms` ✅ |
| Payments | FR37–41 | `settings/billing/`, Stripe webhook idempotency ✅ |
| Team & B2B | FR42–49 | `team/` routes, `{ userId, teamId }` pattern ✅ |
| Admin & Compliance | FR50–62 | `admin/`, `logger.ts`, `analytics.ts`, `CookieConsentBanner`, `rate-limit.ts` ✅ |

**Non-Functional Requirements — all covered:**

| NFR | Architectural Support |
|---|---|
| LCP < 2s | Vercel edge, RSC, streaming first study card, dynamic imports ✅ |
| API p95 < 500ms | Supabase pooler, Drizzle, `unstable_cache` for reads ✅ |
| AI < 5s/card, < 15s/deck | `streamObject()`, gpt-4o-mini fast path ✅ |
| Security | RLS, HTTP-only cookies, server-side AI/payment, rate limiting ✅ |
| GDPR | EU data residency (Supabase Frankfurt + Azure Sweden Central), consent banner, deletion/export ✅ |
| 99.5% uptime | Vercel + Supabase SLA; Sentry alerting; Azure gpt-4o fallback ✅ |
| WCAG 2.1 AA | shadcn/ui accessible primitives; DoD requirement; axe-playwright for E2E ✅ |
| Zero study data loss | Zustand local-first + `sendBeacon` partial save ✅ |

### Implementation Readiness Validation ✅

42 pattern rules with canonical code examples covering every implementation surface. Complete specific project tree with all files named. All FR categories mapped to concrete file locations. Story DoD checklist enforces consistency at execution time. Azure deployment-name routing means model upgrades require only env var changes — no code changes.

### Gap Analysis

**Important (address before or during first sprint):**
- Add `axe-playwright` to E2E suite for WCAG 2.1 AA automated checks on core flows
- Document local dev setup sequence in `README.md`: `supabase start` → `drizzle-kit migrate` → seed → `pnpm dev`
- Validate `supabase.auth.linkIdentity()` race condition in a spike before Sprint 1 (two simultaneous anonymous sessions on different devices)
- Add `session_started` to `AppEvent` union in `src/lib/analytics.ts` for D1/D7/D30 retention cohort support
- Add `tests/integration/webhooks.test.ts` to project structure for Stripe idempotency verification
- Rename E2E spec to `cold-start-to-signup.spec.ts` to explicitly cover the anonymous session handoff path
- Add Supabase Edge Function cron job to purge unconverted anonymous sessions after X days (GDPR MVP requirement)

**Supabase project setup (parallel first story, before any code runs):**
1. Create Supabase project in Frankfurt region (EU data residency)
2. Enable anonymous sign-ins in Supabase Auth settings
3. Set `max_slot_wal_keep_size` to prevent WAL disk exhaustion
4. Deploy in Data Zone Standard for EU compliance guarantee

**Nice-to-have (implementation time):**
- Sentry DSN configuration steps
- Azure AI Foundry deployment setup guide

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] 62 FRs analyzed and mapped to architectural components
- [x] All NFRs addressed architecturally
- [x] Technical constraints documented (solo dev, EU residency, stack locked)
- [x] 6 cross-cutting concerns mapped and resolved

**Architectural Decisions**
- [x] Full stack documented (Next.js + Supabase + Drizzle + Vercel + Stripe + Azure OpenAI + Resend)
- [x] Azure OpenAI model routing strategy (gpt-4o-mini / gpt-5.4-mini / gpt-4o fallback)
- [x] Data schema design (notes/cards/reviews separation, soft-delete, FSRS params)
- [x] Auth pattern (Supabase SSR + anonymous sessions + linkIdentity upgrade)
- [x] Payment flow (Stripe webhook → profiles.tier → RLS)
- [x] All 5 decision categories documented with rationale

**Implementation Patterns (42 rules)**
- [x] Naming conventions (DB, files, code, DAL verbs)
- [x] Data access layer (DAL wrappers, Result type, soft-delete, pagination)
- [x] Error handling (Result type, ErrorCodes registry, boundaries)
- [x] Testing strategy (unit co-located, integration + E2E in tests/, RLS testing)
- [x] Security patterns (RLS, middleware auth, Supabase client split)
- [x] AI patterns (streaming, model routing, sanitization, rate limiting, reverse paywall)
- [x] GDPR patterns (cookie consent, deletion cascade, anonymous session cleanup)
- [x] Story Definition of Done (6-item checklist)

**Project Structure**
- [x] Complete directory tree with all files named
- [x] All FR categories mapped to specific file locations
- [x] Integration boundaries documented (auth, AI, payment, data)
- [x] All external integration entry points defined
- [x] .env convention clarified (.env gitignored, .env.example committed)

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High** *(conditional on linkIdentity spike in Sprint 1)*

**Key Strengths:**
- 42-rule pattern set (6 party mode rounds) eliminates AI agent implementation divergence
- Azure-only LLM stack with deployment-name routing — model upgrades via config, not code
- GDPR compliance is first-class throughout — EU data residency on both Supabase and Azure
- Learning Fingerprint data model (`response_time_ms`, `presentation_mode`) captured from day one
- Reverse paywall, cold start, and anti-streak patterns are architectured end-to-end
- Solo dev constraint respected throughout — monorepo, Supabase built-ins, minimal operational surface

**Areas for Future Enhancement:**
- PWA / offline capability (deferred post-MVP)
- Native mobile architecture (deferred Phase 3)
- Redis caching beyond rate limiting (deferred at scale)
- RWKV neural SRS (deferred at 10k+ users)
- `gpt-4o-mini-tts` + `gpt-4o-transcribe` for audio cards (Phase 2)

### Implementation Handoff

**Supabase Project Setup (before first code commit):**
1. Create Supabase project — Frankfurt region (EU data residency)
2. Enable anonymous sign-ins: Auth → Settings → Enable anonymous sign-ins
3. Set `max_slot_wal_keep_size` in Database settings
4. Note `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Azure OpenAI Setup (before first code commit):**
1. Create Azure OpenAI resource in **Sweden Central** region
2. Deploy three models in Azure AI Foundry: `gpt-4o-mini`, `gpt-5.4-mini`, `gpt-4o`
3. Note deployment names → set as `AZURE_OPENAI_DEPLOYMENT_FAST/LARGE/FALLBACK` in `.env`

**First Implementation Story — scaffold:**
```bash
npx create-next-app@latest flashcards \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --turbopack
```

**Implementation Sequence:**
1. Scaffold + Supabase local setup (`supabase start`)
2. Drizzle schema files + `drizzle.config.ts` (`casing: 'camelCase'`) + RLS SQL files
3. Supabase Auth + anonymous session + `profiles.tier` + middleware
4. Vercel KV + Upstash rate limiting
5. Drizzle DAL wrapper functions + `Result<T>` type
6. Server Actions pattern + Zod validators
7. Stripe integration + webhook + tier sync
8. Azure AI pipeline (`@ai-sdk/azure`) + model routing + streaming
9. ts-fsrs + study session (Zustand local-first + `sendBeacon`)
10. Sentry + structured logging + `trackEvent()`

**AI Agent Guidelines:**
- This document is the single source of truth for all architectural decisions
- Use DAL wrapper functions — never call Drizzle directly in components
- Return `Result<T>` from all Server Actions — never throw across boundaries
- All Azure OpenAI calls route through `src/server/ai/index.ts` — never call `@ai-sdk/azure` directly elsewhere
- Run through the 6-item Story DoD before marking any story complete

## Project Structure & Boundaries

### Environment File Convention

- `.env` — local secrets with real values; **GITIGNORED** (add to `.gitignore`)
- `.env.example` — committed template with empty values; canonical list of all required vars
- `.gitignore` must include `.env` and `.env*.local`

### Complete Project Directory Structure

```
flashcards/
├── .env                                  # Local secrets — GITIGNORED
├── .env.example                          # Committed template (no real values)
├── .gitignore                            # Includes: .env, .env*.local, .next/, node_modules/
├── .husky/
│   └── pre-push                          # tsc --noEmit + eslint check
├── README.md
├── next.config.ts                        # 1. images  2. headers  3. redirects  4. experimental
├── tailwind.config.ts
├── tsconfig.json
├── drizzle.config.ts                     # casing: 'camelCase'; schema + migrations paths
├── vitest.config.ts
├── playwright.config.ts
├── package.json
│
├── supabase/
│   ├── config.toml                       # Local Supabase config
│   ├── seed.sql                          # Development seed data
│   └── migrations/
│       ├── rls/                          # RLS policy SQL files (version-controlled)
│       │   ├── 001_decks_rls.sql
│       │   ├── 002_notes_rls.sql
│       │   ├── 003_cards_rls.sql
│       │   ├── 004_reviews_rls.sql
│       │   ├── 005_teams_rls.sql
│       │   └── 006_profiles_rls.sql
│       └── [drizzle-generated]/          # Auto-generated by drizzle-kit generate
│
├── public/
│   ├── favicon.ico
│   └── og-image.png                      # Open Graph image for sharing
│
└── src/
    ├── middleware.ts                     # Session refresh + auth redirect for /(app)/*
    │                                     # Layouts READ session only — never re-check auth
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx                    # Root layout: CookieConsentBanner, conditional Analytics
    │   ├── error.tsx                     # Root error boundary
    │   │
    │   ├── (marketing)/                  # Public pages — SEO optimized
    │   │   ├── layout.tsx
    │   │   ├── page.tsx                  # Landing page
    │   │   ├── pricing/page.tsx
    │   │   ├── privacy/page.tsx          # GDPR privacy policy (FR8)
    │   │   ├── terms/page.tsx
    │   │   └── sitemap.ts
    │   │
    │   ├── (auth)/                       # Auth pages — no persistent nav
    │   │   ├── layout.tsx
    │   │   ├── login/page.tsx            # FR5: Google + email login
    │   │   ├── signup/page.tsx           # FR3: signup
    │   │   ├── reset-password/page.tsx   # FR12: password reset
    │   │   └── invite/[token]/page.tsx   # FR4, FR45: team invite signup
    │   │
    │   ├── (app)/                        # Authenticated app — persistent nav
    │   │   ├── layout.tsx                # Reads session from middleware; renders AppNav
    │   │   ├── dashboard/
    │   │   │   └── page.tsx              # FR19: deck library + Depth Score overview
    │   │   │
    │   │   ├── decks/
    │   │   │   ├── page.tsx              # FR19: all decks list
    │   │   │   ├── new/page.tsx          # FR14: create deck form
    │   │   │   └── [deckId]/
    │   │   │       ├── page.tsx          # FR16: deck detail + inline card management (FR15–16)
    │   │   │       ├── edit/page.tsx     # FR16: edit deck metadata
    │   │   │       ├── actions.ts        # createDeck, updateDeck, deleteDeck, shareLink
    │   │   │       │                     # createCard, updateCard, deleteCard (inline — no separate route)
    │   │   │       └── study/
    │   │   │           ├── page.tsx      # FR20–26: streams first card via RSC; StudyQueue via Suspense
    │   │   │           ├── loading.tsx   # Skeleton while session initializes
    │   │   │           └── actions.ts    # completeStudySession, savePartialSession
    │   │   │
    │   │   ├── generate/
    │   │   │   ├── page.tsx              # FR27–29: AI deck generation UI
    │   │   │   └── actions.ts            # generateDeckFromTopic, generateFromPaste
    │   │   │
    │   │   ├── team/
    │   │   │   ├── new/page.tsx          # FR42: create team workspace
    │   │   │   ├── actions.ts            # createTeam
    │   │   │   └── [teamId]/
    │   │   │       ├── page.tsx          # FR48: team progress view
    │   │   │       ├── members/page.tsx  # FR43–44: invite + manage members
    │   │   │       ├── assign/page.tsx   # FR46: assign deck to team members
    │   │   │       └── actions.ts        # inviteMembers, assignDeck, sendReminder
    │   │   │
    │   │   ├── settings/
    │   │   │   ├── page.tsx              # FR6: profile settings
    │   │   │   ├── billing/page.tsx      # FR37–40: subscription + billing history
    │   │   │   ├── privacy/page.tsx      # FR7–8, FR13: GDPR delete, export, view data
    │   │   │   ├── sessions/page.tsx     # FR11: active sessions + revoke
    │   │   │   └── actions.ts            # updateProfile, deleteAccount, exportData, revokeSession
    │   │   │
    │   │   └── upgrade/
    │   │       └── page.tsx              # Full upgrade page (direct link from marketing)
    │   │                                 # UpgradeModal used for in-app RATE_LIMIT_EXCEEDED trigger
    │   │
    │   ├── cold-start/
    │   │   └── page.tsx                  # FR1–2: anonymous cold start deck (Supabase anon session)
    │   │
    │   ├── admin/                        # FR50–62: admin dashboard (admin role guard in layout)
    │   │   ├── layout.tsx
    │   │   ├── page.tsx                  # FR59: business metrics dashboard
    │   │   ├── errors/page.tsx           # FR55–57: error log viewer
    │   │   ├── ai-usage/page.tsx         # FR61: AI usage metrics
    │   │   ├── funnel/page.tsx           # FR60: funnel analytics
    │   │   └── actions.ts                # toggleAiFreeTier (FR50), revalidateSystemConfig
    │   │
    │   └── api/                          # Route Handlers — webhooks + beacon endpoints only
    │       ├── stripe/webhook/route.ts   # FR37–41: Stripe webhook (idempotency checked)
    │       ├── resend/webhook/route.ts   # Email bounce handling
    │       └── session/partial/route.ts  # beforeunload beacon (sendBeacon cannot call Server Actions)
    │
    ├── components/
    │   ├── ui/                           # shadcn/ui primitives — DO NOT edit manually
    │   │
    │   ├── shared/
    │   │   ├── CookieConsentBanner.tsx   # FR9, FR51: GDPR consent (client component, root layout)
    │   │   ├── UpgradeModal.tsx          # In-app reverse paywall trigger (RATE_LIMIT_EXCEEDED)
    │   │   ├── AppNav.tsx
    │   │   ├── MarketingNav.tsx
    │   │   └── ErrorBoundaryFallback.tsx
    │   │
    │   ├── deck/
    │   │   ├── DeckCard.tsx
    │   │   ├── DeckList.tsx
    │   │   ├── CreateDeckForm.tsx        # RHF + Zod; submits JSON to Server Action
    │   │   ├── CardEditor.tsx            # FR15–16: inline card add/edit on deck detail page
    │   │   ├── AIGenerationPanel.tsx     # FR27–29: streaming results (dynamic import)
    │   │   └── ShareLinkButton.tsx       # FR18
    │   │
    │   ├── study/
    │   │   ├── FlashCard.tsx             # FR25: single component, mode prop strategy pattern
    │   │   ├── StudyQueue.tsx            # Suspense-streamed card queue
    │   │   ├── DepthScore.tsx            # FR23
    │   │   ├── WeakCardsList.tsx         # FR24
    │   │   ├── RatingButtons.tsx         # FR22
    │   │   └── SessionComplete.tsx       # Post-session summary
    │   │
    │   └── team/
    │       ├── TeamProgressTable.tsx     # FR48
    │       ├── InviteForm.tsx            # FR43–44
    │       ├── AssignDeckModal.tsx        # FR46
    │       └── MemberList.tsx
    │
    ├── server/
    │   ├── db/
    │   │   ├── index.ts                  # Drizzle client + re-exports all schema + relations
    │   │   ├── schema/
    │   │   │   ├── profiles.ts           # profiles table + profileRelations
    │   │   │   ├── fsrs.ts               # user_fsrs_params table
    │   │   │   ├── usage.ts              # ai_usage table
    │   │   │   ├── config.ts             # system_config table
    │   │   │   ├── webhooks.ts           # processed_webhook_events table
    │   │   │   ├── decks.ts              # decks + deckRelations
    │   │   │   ├── notes.ts              # notes + noteRelations
    │   │   │   ├── cards.ts              # cards + cardRelations
    │   │   │   ├── reviews.ts            # reviews + reviewRelations
    │   │   │   └── teams.ts              # teams, team_members + relations
    │   │   └── queries/
    │   │       ├── users.ts              # getProfileById, updateProfileTier, getSystemConfig
    │   │       ├── decks.ts              # findDecksByUserId, getDeckById, createDeck, ...
    │   │       ├── notes.ts              # findNotesByDeckId, createNote, updateNote, ...
    │   │       ├── cards.ts              # findCardsDue, updateCardSchedule, ...
    │   │       ├── reviews.ts            # createReview, findReviewsByUser, getLearningSummary
    │   │       ├── teams.ts              # createTeam, getTeamDecks({userId, teamId}), ...
    │   │       └── webhooks.ts           # getProcessedWebhookEvent, recordProcessedWebhookEvent
    │   │
    │   ├── actions/                      # Shared Server Actions (used across multiple routes)
    │   │   └── stripe.ts                 # createCheckoutSession, createBillingPortalSession
    │   │
    │   ├── ai/
    │   │   ├── index.ts                  # generateDeck(), generateCards() — streamObject wrappers
    │   │   ├── prompts.ts                # System prompts, few-shot examples
    │   │   └── sanitize.ts               # PII stripping, prompt injection defense (FR34)
    │   │
    │   ├── fsrs/
    │   │   └── index.ts                  # scheduleCard(), initializeCard() — only ts-fsrs importer
    │   │
    │   └── email/
    │       ├── index.ts                  # sendEmail() wrapper (Resend + React Email)
    │       └── templates/
    │           ├── InviteEmail.tsx       # FR45
    │           ├── ReEngagementEmail.tsx # Phase 2
    │           └── ReceiptEmail.tsx
    │
    ├── lib/
    │   ├── supabase/
    │   │   ├── server.ts                 # createServerClient() — service role, admin/webhooks only
    │   │   └── user.ts                   # createUserClient(session) — anon key, all DAL queries
    │   ├── logger.ts                     # Typed log() wrapper
    │   ├── analytics.ts                  # trackEvent(name: AppEvent, properties)
    │   ├── rate-limit.ts                 # Upstash ratelimit wrappers
    │   ├── constants.ts
    │   └── validators/
    │       ├── deck.ts
    │       ├── card.ts
    │       ├── team.ts
    │       └── ai.ts
    │
    ├── types/
    │   ├── index.ts                      # Result<T> + all Drizzle inferred named types
    │   └── errors.ts                     # ErrorCodes const + ErrorCode type
    │
    ├── hooks/
    │   ├── useStudySession.ts
    │   └── useCookieConsent.ts
    │
    └── stores/
        ├── study-session.ts              # Zustand: card queue, ratings, session state
        └── cookie-consent.ts             # Zustand: analytics consent

tests/                                    # Integration + E2E only (unit tests are co-located in src/)
├── helpers/
│   ├── supabase.ts                       # createTestUserClient() with mock session (anon key)
│   ├── factories.ts                      # createTestDeck(), createTestCard(), etc.
│   └── setup.ts                          # Vitest global setup
├── integration/                          # Hit local Supabase — always use anon key + JWT
│   ├── decks.test.ts
│   ├── cards.test.ts
│   ├── reviews.test.ts
│   └── teams.test.ts
└── e2e/                                  # Playwright — critical user paths
    ├── cold-start.spec.ts                # FR1: anonymous cold start
    ├── signup.spec.ts                    # FR3: signup + first deck
    ├── study-session.spec.ts             # FR20–26
    ├── ai-generation.spec.ts             # FR27–29
    ├── upgrade.spec.ts                   # FR37: freemium → Pro
    └── team-onboarding.spec.ts           # FR42–49
```

### Architectural Boundaries

**Auth Boundary:**
- `middleware.ts` — sole enforcer of route protection; session refresh on every request
- `src/lib/supabase/user.ts` — all user data access; anon key + user JWT
- `src/lib/supabase/server.ts` — service role restricted to admin routes + webhook handlers
- RLS policies in `supabase/migrations/rls/` — DB-level safety net

**AI Boundary:**
- All AI calls exit through `src/server/ai/index.ts` only
- `src/server/ai/sanitize.ts` strips PII before any prompt reaches LLM
- API keys are server-only (no `NEXT_PUBLIC_` prefix)
- Rate limiting checked in Server Action before call reaches `src/server/ai/`

**Payment Boundary:**
- Checkout/portal: `src/server/actions/stripe.ts`
- Webhook: `src/app/api/stripe/webhook/route.ts` with idempotency check
- Tier sync writes to `profiles.tier` — single source of truth for RBAC

**Data Boundary:**
- Components never import from `src/server/db/` directly
- All DB access flows through `src/server/db/queries/` DAL wrappers
- Zod validation always at Server Action boundary before DAL is called
- Soft-delete filter always present in list queries

**Route Handler Exception:**
Route Handlers (`/api/`) are used for: (1) external webhooks (Stripe, Resend), and (2) beacon endpoints where `navigator.sendBeacon` cannot invoke a Server Action directly. All other mutations use Server Actions.

### Requirements to Structure Mapping

| FR Category | Primary Location |
|---|---|
| Discovery & Onboarding (FR1–4) | `src/app/cold-start/`, `src/app/(auth)/` |
| Auth & Account Management (FR5–13) | `src/app/(auth)/`, `src/app/(app)/settings/`, `src/lib/supabase/` |
| Deck & Card Management (FR14–19) | `src/app/(app)/decks/` (cards inline — no separate route), `src/components/deck/` |
| Study & Learning Engine (FR20–26) | `src/app/(app)/decks/[deckId]/study/`, `src/components/study/`, `src/server/fsrs/` |
| AI & Personalization (FR27–36) | `src/app/(app)/generate/`, `src/server/ai/`, `src/server/db/queries/reviews.ts` |
| Payments & Subscriptions (FR37–41) | `src/app/(app)/settings/billing/`, `src/server/actions/stripe.ts`, `src/app/api/stripe/webhook/` |
| Team & B2B Workspace (FR42–49) | `src/app/(app)/team/`, `src/components/team/`, `src/server/db/queries/teams.ts` |
| Admin & Compliance (FR50–62) | `src/app/admin/`, `src/lib/analytics.ts`, `src/lib/logger.ts` |

### Integration Points

**Internal Data Flow:**
```
User action → Client Component
           → Server Action (Zod validate → DAL wrapper → Drizzle → Supabase RLS → DB)
           → Result<T> → revalidatePath/tag → RSC re-render
```

**AI Generation Flow:**
```
User prompt → Server Action → rate limit check → sanitize.ts
           → src/server/ai/index.ts → route by doc size:
             short (≤20 cards): gpt-4o-mini deployment
             large doc (PDF):   gpt-5.4-mini deployment (400K context)
           → streamObject() → Azure OpenAI (Sweden Central)
           → [on timeout/error] → gpt-4o fallback deployment (same Azure resource)
           → Card[] stream → client progressive render → user reviews → save to DB
```

**Study Session Flow:**
```
Page load → RSC fetches first card immediately (< 1s NFR)
         → Suspense streams StudyQueue in background
         → User rates cards → Zustand store accumulates
         → Session end → getSessionResult() → completeStudySession() Server Action
         → Drizzle batch: createReview × N + updateCardSchedule × N + updateDepthScore
         → revalidatePath('/dashboard')
```

**Stripe Subscription Flow:**
```
Upgrade click → createCheckoutSession() → Stripe hosted checkout
             → Payment success → Stripe webhook POST /api/stripe/webhook
             → idempotency check → updateProfileTier() → RLS grants update automatically
```

**External Integrations:**

| Integration | Entry Point | Credential |
|---|---|---|
| Azure OpenAI (gpt-4o-mini) | `src/server/ai/index.ts` | `AZURE_OPENAI_DEPLOYMENT_FAST` |
| Azure OpenAI (gpt-5.4-mini) | `src/server/ai/index.ts` | `AZURE_OPENAI_DEPLOYMENT_LARGE` |
| Azure OpenAI (gpt-4o fallback) | `src/server/ai/index.ts` | `AZURE_OPENAI_DEPLOYMENT_FALLBACK` |
| Stripe | `src/server/actions/stripe.ts` + webhook | `STRIPE_SECRET_KEY` |
| Supabase | `src/lib/supabase/` | `SUPABASE_SERVICE_ROLE_KEY` / anon key |
| Resend | `src/server/email/index.ts` | `RESEND_API_KEY` |
| Vercel KV | `src/lib/rate-limit.ts` | `KV_REST_API_TOKEN` |
| Sentry | Auto via Next.js SDK | `SENTRY_DSN` |
