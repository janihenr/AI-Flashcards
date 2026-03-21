# Story 1.1: Project Scaffold & Core Infrastructure Setup

Status: ready-for-dev

## Story

As a solo developer building the Flashcards SaaS,
I want the project fully scaffolded with Next.js, TypeScript, Tailwind, Drizzle ORM, core lib utilities, Sentry, and a production-ready config,
so that all subsequent development has a consistent, zero-tech-debt foundation.

## Acceptance Criteria

1. **Given** the repository is empty, **When** the scaffold is complete, **Then** the project is bootstrapped via:
   ```bash
   npx create-next-app@latest flashcards --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
   ```

2. Drizzle ORM is installed (`pnpm add drizzle-orm drizzle-kit`) and `drizzle.config.ts` is configured with `casing: 'camelCase'`, `dialect: 'postgresql'`, `schema: './src/server/db/schema'`, `out: './supabase/migrations'`

3. `src/types/index.ts` exports the canonical `Result<T>` type:
   ```typescript
   export type Result<T> =
     | { data: T; error: null }
     | { data: null; error: { message: string; code?: string } }
   ```

4. `src/lib/logger.ts` exports a typed `log(entry: LogEntry)` function that writes structured JSON to stdout (stdout only — never stores user-supplied text content)

5. `src/types/errors.ts` exports the `ErrorCodes` registry with: `RATE_LIMIT_EXCEEDED`, `AI_UNAVAILABLE`, `CONTENT_POLICY_VIOLATION`, `UNAUTHORIZED`, `NOT_FOUND`, `STRIPE_WEBHOOK_DUPLICATE`

6. `src/lib/constants.ts` exports all shared app constants: `HESITATION_THRESHOLD_MS`, `FSRS_DEFAULT_RETENTION`, `MAX_FREE_GENERATIONS`, `FINGERPRINT_MIN_SESSIONS`, `MIN_TEAM_SEATS`, `WEAK_CARD_THRESHOLD`, `INVITE_EXPIRY_DAYS`, `INVITE_RATE_LIMIT`

7. `src/lib/analytics.ts` exports `trackEvent(name: AppEvent, properties: Record<string, unknown>)` wired to Vercel Analytics — fire-and-forget, non-blocking

8. Sentry is integrated (`pnpm add @sentry/nextjs`) with critical alert rules for payment and auth failures (within 5 min threshold per NFR-REL3)

9. `axe-playwright` is added to the E2E test suite for automated WCAG 2.1 AA checks on all core flows

10. `.env.example` documents **all** required environment variables with comments (see Dev Notes for canonical list)

11. `src/server/ai/index.ts` exports AI model routing logic — fast (gpt-4o-mini), large (gpt-4.1), fallback (gpt-4o) — via `@ai-sdk/azure`

12. Husky pre-push hook runs `tsc --noEmit` + ESLint before every push

13. `next.config.ts` is set up with security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) in the canonical section order

## Tasks / Subtasks

- [ ] Task 1: Bootstrap Next.js project (AC: #1)
  - [ ] Run `npx create-next-app@latest flashcards --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack`
  - [ ] Verify `src/` directory structure exists with `app/`, `components/`, `lib/`

- [ ] Task 2: Install all required packages (AC: #2, #7, #8, #9, #11)
  - [ ] `pnpm add drizzle-orm drizzle-kit`
  - [ ] `pnpm add @sentry/nextjs`
  - [ ] `pnpm add ai @ai-sdk/azure`
  - [ ] `pnpm add zod` (peer dep of AI SDK, install explicitly)
  - [ ] `pnpm add @vercel/analytics` (Vercel Analytics — required by analytics.ts)
  - [ ] `pnpm add -D vitest @vitejs/plugin-react` (unit testing)
  - [ ] `pnpm add -D @playwright/test axe-playwright` (E2E + accessibility)
  - [ ] `pnpm add -D husky`

- [ ] Task 3: Configure Drizzle ORM (AC: #2)
  - [ ] Create `drizzle.config.ts` with `casing: 'camelCase'`, `dialect: 'postgresql'`, `schema: './src/server/db/schema'`, `out: './supabase/migrations'`
  - [ ] Create `src/server/db/index.ts` (Drizzle client placeholder — connection requires Supabase from Story 1.2)
  - [ ] Create `src/server/db/schema/` directory with placeholder `index.ts`

- [ ] Task 4: Create core type definitions (AC: #3, #5, #6)
  - [ ] Create `src/types/index.ts` with `Result<T>` type + `CardMode` type
  - [ ] Create `src/types/errors.ts` with `ErrorCodes` registry
  - [ ] Create `src/lib/constants.ts` with all shared constants

- [ ] Task 5: Create logger utility (AC: #4)
  - [ ] Create `src/lib/logger.ts` with typed `LogEntry` interface and `log()` function
  - [ ] Ensure PII guard is enforced — no user-supplied text content in logs

- [ ] Task 6: Create analytics utility (AC: #7)
  - [ ] Create `src/lib/analytics.ts` with `AppEvent` type and `trackEvent()` function
  - [ ] Wire to Vercel Analytics via `@vercel/analytics` (fire-and-forget, non-blocking)

- [ ] Task 7: Create AI model router (AC: #11)
  - [ ] Create `src/server/ai/index.ts` with `getAIModel(route: 'fast' | 'large' | 'fallback')` function
  - [ ] Reads `AZURE_OPENAI_DEPLOYMENT_FAST/LARGE/FALLBACK` env vars
  - [ ] Uses `@ai-sdk/azure` — never exposes API key to client

- [ ] Task 8: Configure Sentry (AC: #8)
  - [ ] Run Sentry Next.js wizard or manually add `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
  - [ ] Configure alert for payment failures and auth failures within 5-minute threshold

- [ ] Task 9: Configure testing and write utility unit tests (AC: #9)
  - [ ] Create `vitest.config.ts` for unit tests
  - [ ] Create `playwright.config.ts` with `axe-playwright` integration
  - [ ] Create `src/tests/helpers/` directory for shared test utilities
  - [ ] Write `src/lib/logger.test.ts` — verify `log()` outputs valid JSON to stdout and never includes user-supplied content fields
  - [ ] Write `src/lib/constants.test.ts` — verify all exported constant values match the canonical spec
  - [ ] Write `src/types/errors.test.ts` — verify all `ErrorCodes` keys and values are present

- [ ] Task 10: Configure environment variables (AC: #10)
  - [ ] Create `.env.example` with ALL canonical env vars and comments
  - [ ] Create `.env.local` locally (git-ignored) with dev values

- [ ] Task 11: Configure Husky + next.config.ts (AC: #12, #13)
  - [ ] Initialize Husky: `pnpm dlx husky init`
  - [ ] Add pre-push hook: `tsc --noEmit && eslint . --max-warnings 0`
  - [ ] Configure `next.config.ts` with security headers in canonical order

- [ ] Task 12: Set up project directory structure
  - [ ] Create all directories from canonical structure (see Project Structure Notes)
  - [ ] Add `.gitkeep` for empty directories that need to exist

## Dev Notes

### Tech Stack (LOCKED — do not deviate)

- **Runtime:** Next.js App Router (RSC-first), TypeScript strict mode, Node.js
- **Styling:** Tailwind CSS v4 (included via scaffold flag), shadcn/ui added later via `npx shadcn@latest init` (NOT in this story)
- **Build:** Turbopack (dev), Next.js production build on Vercel
- **ORM:** Drizzle ORM — `casing: 'camelCase'` in config maps snake_case DB columns to camelCase TS
- **AI SDK:** Vercel AI SDK `@ai-sdk/azure` — ALL AI calls server-side only
- **Testing:** Vitest (unit), Playwright + axe-playwright (E2E + accessibility)
- **Package manager:** `pnpm` (use pnpm for all installs)

### Package Install Order (CRITICAL — follow this sequence exactly per Architecture)

Install in this order after scaffold:
1. `pnpm add drizzle-orm drizzle-kit` + Drizzle config
2. `pnpm add ai @ai-sdk/azure` (Vercel AI SDK)
3. `pnpm add @vercel/analytics` (Vercel Analytics — used by analytics.ts)
4. Later stories add: `pnpm add ts-fsrs`, `pnpm add stripe @stripe/stripe-js`, `pnpm add resend`, `pnpm add @upstash/ratelimit @vercel/kv`, `pnpm add zustand`
5. `npx shadcn@latest init` (shadcn/ui — do NOT add in this story)

**DO NOT** install Supabase packages in this story — that is Story 1.2.
**DO NOT** install ts-fsrs — that is Story 1.2+.
**DO NOT** install `framer-motion` in this story — defer to the story that implements card flip animation.

### Canonical `Result<T>` Type (AC #3 — must match exactly)

```typescript
// src/types/index.ts — SINGLE SOURCE OF TRUTH
export type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string; code?: string } }
```

All DAL functions and Server Actions return `Result<T>`. Never `throw` across these boundaries. Components branch on `result.error?.code` for different UI treatments.

### Canonical `LogEntry` Interface (AC #4 — must match exactly)

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

**PII Guard (CRITICAL):** `log()` must NEVER include user-supplied text content (deck titles, card content, AI prompts). Allowed fields: `userId`, `role`, `tier`, `action`, `errorCode`, `timestamp`, `requestId`, `durationMs`. Violating this breaks GDPR compliance.

### Canonical `ErrorCodes` Registry (AC #5)

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

### Canonical `constants.ts` (AC #6 — exact values required)

```typescript
// src/lib/constants.ts
export const HESITATION_THRESHOLD_MS = 10_000   // strictly > (not >=); exactly 10000ms does NOT trigger
export const FSRS_DEFAULT_RETENTION = 0.9        // 90% desired retention target for ts-fsrs
export const MAX_FREE_GENERATIONS = 10           // monthly AI cap for free-tier (calendar month, UTC)
export const FINGERPRINT_MIN_SESSIONS = 5        // min sessions before Layer 2 prefs diverge from default
export const MIN_TEAM_SEATS = 3                  // Stripe checkout minimum seats
export const WEAK_CARD_THRESHOLD = 0.70          // FSRS retrievability below this = weak card
export const INVITE_EXPIRY_DAYS = 7              // pending_invites expiry in days
export const INVITE_RATE_LIMIT = 20              // max team invite sends per admin per hour
```

### Canonical `CardMode` Type (add to `src/types/index.ts`)

```typescript
// src/types/index.ts — exported alongside Result<T>
export type CardMode = 'qa' | 'image' | 'context-narrative'
// qa:               front = question text, back = answer text
// image:            front = image (imageUrl required), back = label/explanation
// context-narrative: front = scenario/story framing, back = answer/resolution
```

ALL code importing `CardMode` must do so from `@/types` — NEVER from schema files directly.

### AI Model Router (AC #11 — exact structure required)

```typescript
// src/server/ai/index.ts
import { createAzure } from '@ai-sdk/azure'

const azure = createAzure({
  resourceName: process.env.AZURE_OPENAI_ENDPOINT!,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
})

export const aiModels = {
  fast: azure(process.env.AZURE_OPENAI_DEPLOYMENT_FAST!),     // gpt-4o-mini — card generation
  large: azure(process.env.AZURE_OPENAI_DEPLOYMENT_LARGE!),   // gpt-4.1 — long doc ingestion
  fallback: azure(process.env.AZURE_OPENAI_DEPLOYMENT_FALLBACK!), // gpt-4o — fallback on error
} as const
```

Usage pattern in Server Actions:
- Short generation (topic/paste ≤20 cards): `aiModels.fast` with `generateObject()` or `streamObject()`
- Long document ingestion: `aiModels.large`
- Automatic fallback on timeout: switch to `aiModels.fallback`

### Canonical `.env.example` (AC #10 — include ALL vars)

```bash
# Supabase (EU Frankfurt — added in Story 1.2)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SYSTEM_USER_ID=            # UUID of locked system user for cold start deck (set in Story 1.2)

# Azure OpenAI (Sweden Central — EU Data Zone)
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=            # https://{resource}.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_FAST=     # gpt-4o-mini deployment name
AZURE_OPENAI_DEPLOYMENT_LARGE=    # gpt-4.1 deployment name (1M context)
AZURE_OPENAI_DEPLOYMENT_FALLBACK= # gpt-4o deployment name

# Stripe (added in Epic 7)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Resend (added in Epic 8)
RESEND_API_KEY=

# Vercel KV / Upstash (added in Story 1.2+)
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Sentry (added in this story)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=         # for source map upload in CI

# App
NEXT_PUBLIC_APP_URL=       # e.g. http://localhost:3000 locally, https://flashcards.app in prod
```

**Convention:**
- Public (client-accessible): `NEXT_PUBLIC_{SERVICE}_{KEY}`
- Private (server-only): `{SERVICE}_{KEY}`
- Agents add new vars to `.env.example` whenever they introduce them

### `next.config.ts` Canonical Section Order (AC #13)

```typescript
// next.config.ts — sections MUST appear in this order
const config: NextConfig = {
  images: { remotePatterns: [/* Supabase Storage domain */] },
  async headers() { /* CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy */ },
  async redirects() { /* marketing redirects */ },
  experimental: { /* turbopack config */ },
}
```

Security headers must include at minimum:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (restrictive; update as new external domains are added)

### Drizzle Config (AC #2 — exact values)

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema',
  out: './supabase/migrations',
  casing: 'camelCase',  // snake_case DB → camelCase TypeScript automatically
})
```

`casing: 'camelCase'` is NON-NEGOTIABLE — it drives the entire DB/TS naming separation. Without it, queries will break silently.

### Analytics Utility Pattern

```typescript
// src/lib/analytics.ts
type AppEvent =
  | 'cold_start_viewed' | 'signup' | 'deck_created'
  | 'ai_generation_used' | 'study_session_started' | 'study_session_completed'
  | 'paywall_hit' | 'upgrade' | 'team_created' | 'deck_assigned'

export function trackEvent(name: AppEvent, properties: Record<string, unknown>) {
  // Vercel Analytics + structured log — fire-and-forget, non-blocking
  // Analytics data loss is acceptable; this is NOT transactional
}
```

### Husky Pre-Push Hook

```bash
# .husky/pre-push
#!/bin/sh
pnpm tsc --noEmit
pnpm eslint . --max-warnings 0
```

This runs locally before every `git push`. Do not use `--no-verify` to bypass it.

### Testing Architecture

- **Unit tests:** pure logic — Zod validators, utility functions, FSRS calculations (later stories)
  - Co-located: `{filename}.test.ts` alongside source file
  - Runner: Vitest
- **Integration tests:** DAL wrappers against local Supabase (added in Story 1.2+)
  - Location: `tests/integration/`
  - Must use `createUserClient(mockSession)` — NEVER service role key for user data tests
  - Each list query test must include a case verifying a user CANNOT access another user's data
- **E2E tests:** critical user paths — Playwright + `axe-playwright` for WCAG 2.1 AA
  - Location: `tests/e2e/`
  - `axe-playwright` added here (AC #9) — WCAG checks run on all core flows
- **Shared fixtures:** `src/tests/helpers/` — shared setup, never duplicated per-file

### Story Definition of Done (applies to ALL stories including this one)

A story is complete when ALL are true:
1. Tests — unit/integration written and passing for new logic
2. Result type — Server Actions return `Result<T>`; no thrown exceptions across boundaries
3. `.env.example` — any new env vars added with comments
4. Structured log — `log()` called for any AI generation, payment, or error event
5. Soft-delete filter — any `find*` list query includes `isNull(table.deletedAt)`
6. Event tracking — `trackEvent()` called if action corresponds to an FR58 product event

### Project Structure Notes

Full canonical directory structure to create in this story:

```
src/
  app/
    (auth)/                     # Auth pages (login, signup, reset) — populated later
    (marketing)/                # Public/landing pages — populated later
    (app)/                      # Authenticated app routes — populated later
      dashboard/
      decks/[deckId]/study/
      team/
      settings/
    api/                        # Route Handlers — webhooks only
      stripe/webhook/
      resend/webhook/
  components/
    ui/                         # shadcn/ui primitives — DO NOT edit (populated via shadcn CLI later)
    deck/
    study/
    team/
    shared/
  server/
    db/
      schema/                   # Drizzle schema files (one per domain) — created in Story 1.2
      queries/                  # DAL wrapper functions — created as features are built
      index.ts                  # Drizzle client + re-exports (placeholder for now)
    actions/                    # Shared Server Actions (only when used across routes)
    ai/
      index.ts                  # AI model router — CREATED IN THIS STORY
    fsrs/
      index.ts                  # FSRS encapsulation (scheduleCard, initializeCard) — Story 1.2+
    email/
      templates/                # React Email components — Story 8
      index.ts                  # sendEmail() wrapper — Story 8
  lib/
    supabase/
      server.ts                 # createServerClient() — Story 1.2
      user.ts                   # createUserClient() — Story 1.2
    logger.ts                   # CREATED IN THIS STORY
    analytics.ts                # CREATED IN THIS STORY
    constants.ts                # CREATED IN THIS STORY
    validators/                 # Zod schemas by feature — added per story
  types/
    index.ts                    # Result<T>, CardMode, Drizzle-inferred types — CREATED IN THIS STORY
    errors.ts                   # ErrorCodes registry — CREATED IN THIS STORY
  hooks/                        # Client-side React hooks
  stores/                       # Zustand stores (added in study session stories)
  tests/
    helpers/                    # Shared test utilities
supabase/
  migrations/                   # Drizzle-generated schema migrations
  migrations/rls/               # RLS policy SQL files (version-controlled)
  seed.sql                      # System user + cold start deck (Story 1.2)
```

**Naming rules (MUST follow):**
- Component files: `PascalCase.tsx` — `DeckCard.tsx`, `StudySession.tsx`
- Non-component files: `kebab-case.ts` — `get-decks.ts`, `stripe-webhook.ts`
- Directories: `kebab-case`
- Test files: co-located `{filename}.test.ts`
- Server Action files: `actions.ts` co-located with route; promote to `src/server/actions/{feature}.ts` only if genuinely shared across multiple routes

**Import alias:** `@/*` maps to `src/*` (set by scaffold). Always use `@/` imports — never relative paths for cross-module imports.

### Architecture Compliance Checklist (Anti-Disaster)

- [ ] `Result<T>` type is in `src/types/index.ts` — NOWHERE else
- [ ] `CardMode` type is in `src/types/index.ts` — never in schema files
- [ ] `ErrorCodes` is in `src/types/errors.ts` — nowhere else
- [ ] `log()` NEVER logs user-supplied content (deck titles, card content, AI prompts)
- [ ] AI keys NEVER go to the client — `src/server/ai/index.ts` is server-only
- [ ] Drizzle config has `casing: 'camelCase'` — verify before story closes
- [ ] `axe-playwright` is in `devDependencies`, not `dependencies`
- [ ] `.env.example` committed; `.env.local` in `.gitignore`

### References

- Scaffold command & post-scaffold additions: `_bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation`
- Result type pattern: `_bmad-output/planning-artifacts/architecture.md#Format Patterns`
- Logger canonical spec: `_bmad-output/planning-artifacts/architecture.md#Communication Patterns`
- AI model routing: `_bmad-output/planning-artifacts/architecture.md#API & Communication Patterns`
- Directory structure: `_bmad-output/planning-artifacts/architecture.md#Structure Patterns`
- Testing strategy: `_bmad-output/planning-artifacts/architecture.md#Testing Strategy`
- Environment variables: `_bmad-output/planning-artifacts/architecture.md#Environment Variable Convention`
- Story 1.1 acceptance criteria: `_bmad-output/planning-artifacts/epics.md#Story 1.1`
- Constants values: `_bmad-output/planning-artifacts/architecture.md#Hesitation Time Signal`
- Epic 1 overview: `_bmad-output/planning-artifacts/epics.md#Epic 1: Foundation & Cold Start Experience`
- ARCH1 (scaffold command): epics.md#Additional Requirements

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
