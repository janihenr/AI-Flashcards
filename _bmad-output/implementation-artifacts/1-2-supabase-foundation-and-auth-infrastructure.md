# Story 1.2: Supabase Foundation & Auth Infrastructure

Status: ready-for-dev

## Story

As a developer,
I want Supabase connected with anonymous sign-in enabled, the client split by trust level, RLS policies versioned as SQL files, cursor-based pagination implemented, and the linkIdentity() upgrade path spiked,
so that the app has a secure, EU-resident, GDPR-compliant data layer ready for all features.

## Acceptance Criteria

1. **Given** the Supabase project is created in the Frankfurt (EU) region with `max_slot_wal_keep_size` configured, **When** the setup is complete, **Then** the Supabase client is split: `createServerAdminClient()` (service role, admin only, in `src/lib/supabase/server.ts`) and `createUserClient()` (anon key, HTTP-only cookies, in `src/lib/supabase/user.ts`)

2. All DB interactions go through typed DAL wrapper functions in `src/server/db/queries/` — no raw Drizzle in components, pages, or route handlers

3. Anonymous sign-ins are enabled in Supabase Auth settings; `src/middleware.ts` is configured to refresh Supabase sessions on every request

4. RLS policy SQL files are versioned under `supabase/migrations/rls/` — one file per domain table with policies matching the architecture trust model

5. A cursor-based pagination helper (`paginationHelper`) is implemented in `src/lib/pagination.ts`: `{ limit, cursor? }` → `{ items, nextCursor }`; all `find*` DAL list functions use this pattern from day one

6. A Supabase Edge Function `purge-anonymous-sessions` is defined in `supabase/functions/purge-anonymous-sessions/index.ts` with a cron schedule that purges unconverted anonymous sessions older than 30 days (hard-deletes reviews first, then the anonymous_sessions row)

7. The `supabase.auth.linkIdentity()` anonymous-to-auth upgrade path is spiked: race condition behavior is documented in `docs/adr/001-link-identity-race-condition.md` with a confirmed mitigation strategy

8. Supabase connection pooling is configured via Supabase Pooler (transaction mode pooler URL in `DATABASE_URL`); `src/server/db/index.ts` is completed (was a placeholder in Story 1.1) using `postgres-js` with `{ prepare: false }` for serverless compatibility

9. `seed.sql` is created at `supabase/seed.sql` with: a system user row in `auth.users` + matching row in `profiles` with `tier = 'free'`, `isAdmin = false`; `SYSTEM_USER_ID` env var must be set before running the seed

10. A `validateSystemUser()` DAL function is created in `src/server/db/queries/users.ts` that verifies `SYSTEM_USER_ID` env var is set and the account exists in `profiles`; this function is called in `next.config.ts` server instrumentation to fail-fast on startup if the system user is missing

11. Vercel KV + `@upstash/ratelimit` rate-limiting infrastructure is installed and a reusable `rateLimit(identifier, windowMs, maxAttempts)` helper is created in `src/lib/rate-limit.ts`; auth rate limiting (10 attempts / 15 min per IP) is wired up as middleware for the `/api/auth/` path prefix

12. `.env.example` is updated with all new environment variables introduced in this story (DATABASE_URL, SYSTEM_USER_ID, KV_REST_API_URL, KV_REST_API_TOKEN)

## Tasks / Subtasks

- [ ] Task 1: Install new packages (AC: #1, #8, #11)
  - [ ] `pnpm add @supabase/supabase-js @supabase/ssr`
  - [ ] `pnpm add @upstash/ratelimit @vercel/kv`
  - [ ] `pnpm add postgres` (postgres-js driver for Drizzle)
  - [ ] Verify `@supabase/supabase-js` and `@supabase/ssr` are installed as dependencies (not devDependencies)

- [ ] Task 2: Create Supabase client files (AC: #1, #3)
  - [ ] Create `src/lib/supabase/server.ts` — `createServerAdminClient()` using service role key (see canonical pattern in Dev Notes)
  - [ ] Create `src/lib/supabase/user.ts` — `createUserClient()` using anon key + cookie store (see canonical pattern in Dev Notes)
  - [ ] Create `src/middleware.ts` — session refresh middleware (see canonical pattern in Dev Notes)
  - [ ] Verify `createServerAdminClient()` is ONLY importable in server context (add `'use server'` directive or `server-only` import guard if needed)

- [ ] Task 3: Complete Drizzle DB client (AC: #8)
  - [ ] Update `src/server/db/index.ts` with postgres-js driver using `DATABASE_URL` env var and `{ prepare: false }` for serverless
  - [ ] Confirm `casing: 'camelCase'` is passed to `drizzle()` constructor (matches `drizzle.config.ts`)
  - [ ] Re-export all schema tables and relations from `src/server/db/index.ts`

- [ ] Task 4: Create all domain schema files (AC: #2)
  - [ ] Create `src/server/db/schema/users.ts` — profiles, systemConfig, aiUsage, analyticsEvents, anonymousSessions, processedWebhookEvents (see canonical schemas in Dev Notes)
  - [ ] Create `src/server/db/schema/decks.ts` — decks, notes, deckShares (see canonical schemas in Dev Notes)
  - [ ] Create `src/server/db/schema/cards.ts` — cardModeEnum, cards (see canonical schemas in Dev Notes)
  - [ ] Create `src/server/db/schema/reviews.ts` — reviews (see canonical schemas in Dev Notes)
  - [ ] Create `src/server/db/schema/teams.ts` — teams, teamMembers, pendingInvites, teamDeckAssignments (see canonical schemas in Dev Notes)
  - [ ] Update `src/server/db/schema/index.ts` to re-export all schema files
  - [ ] Run `pnpm drizzle-kit generate` to produce migration SQL files in `supabase/migrations/`

- [ ] Task 5: Create DAL wrapper scaffolding (AC: #2, #10)
  - [ ] Create `src/server/db/queries/users.ts` with: `getUserProfile()`, `validateSystemUser()`, `updateProfileTier()` stubs returning `Result<T>`
  - [ ] Create `src/server/db/queries/decks.ts` with: `findDecksByUserId()`, `getDeckById()` stubs returning `Result<T>`
  - [ ] Create `src/server/db/queries/cards.ts` with: `findCardsDue()` stub
  - [ ] Create `src/server/db/queries/reviews.ts` with: `createReview()` stub
  - [ ] Create `src/server/db/queries/teams.ts` with: `getTeamById()` stub
  - [ ] All DAL functions must return `Result<T>` — never throw; import `Result` from `@/types`
  - [ ] All list DAL functions include soft-delete filter: `where(isNull(table.deletedAt))`
  - [ ] All list DAL functions accept `PaginationInput` and return `PaginationResult<T>` (see pagination helper)

- [ ] Task 6: Create cursor pagination helper (AC: #5)
  - [ ] Create `src/lib/pagination.ts` with `PaginationInput`, `PaginationResult<T>` types and `encodeCursor`/`decodeCursor` helpers (see canonical pattern in Dev Notes)

- [ ] Task 7: Create RLS policy SQL files (AC: #4)
  - [ ] Create `supabase/migrations/rls/profiles_rls.sql` — user can SELECT/UPDATE own row; admin can SELECT all
  - [ ] Create `supabase/migrations/rls/decks_rls.sql` — owner full CRUD; deck_shares recipients SELECT only; anonymous + auth users SELECT system-user-owned decks
  - [ ] Create `supabase/migrations/rls/cards_rls.sql` — owner + shared/team readers SELECT; owner CUD
  - [ ] Create `supabase/migrations/rls/reviews_rls.sql` — user can CRD own reviews only
  - [ ] Create `supabase/migrations/rls/anonymous_sessions_rls.sql` — service role only (no user access)
  - [ ] Create `supabase/migrations/rls/system_config_rls.sql` — public SELECT (via unstable_cache); admin-only UPDATE
  - [ ] Create `supabase/migrations/rls/analytics_events_rls.sql` — admin-only SELECT; service role INSERT only
  - [ ] Each SQL file enables RLS on the table and defines all policies; see canonical RLS SQL pattern in Dev Notes

- [ ] Task 8: Create Supabase Edge Function for GDPR cleanup (AC: #6)
  - [ ] Create `supabase/functions/purge-anonymous-sessions/index.ts` — Deno Edge Function (see canonical code in Dev Notes)
  - [ ] Add cron schedule configuration: daily at 03:00 UTC via `supabase/functions/purge-anonymous-sessions/config.toml`

- [ ] Task 9: Spike linkIdentity() and write ADR (AC: #7)
  - [ ] Research `supabase.auth.linkIdentity()` behavior for anonymous → authenticated upgrade
  - [ ] Identify the race condition: concurrent signup while anonymous session is active
  - [ ] Document confirmed mitigation strategy (e.g., optimistic lock, retry with conflict detection)
  - [ ] Write ADR to `docs/adr/001-link-identity-race-condition.md` (see ADR template in Dev Notes)
  - [ ] Create `docs/adr/` directory if it doesn't exist

- [ ] Task 10: Create seed.sql and validateSystemUser() (AC: #9, #10)
  - [ ] Create `supabase/seed.sql` with system user insert (see canonical SQL in Dev Notes)
  - [ ] Implement `validateSystemUser()` in `src/server/db/queries/users.ts`
  - [ ] Wire `validateSystemUser()` call in `next.config.ts` (server instrumentation, startup validation only)

- [ ] Task 11: Rate limiting infrastructure (AC: #11)
  - [ ] Create `src/lib/rate-limit.ts` with reusable `rateLimit()` helper wrapping `@upstash/ratelimit` (see canonical pattern in Dev Notes)
  - [ ] Add auth rate limiting in `src/middleware.ts` for `/api/auth/` path prefix: 10 attempts / 15 min per IP

- [ ] Task 12: Update environment variables (AC: #12)
  - [ ] Add `DATABASE_URL` to `.env.example` (Supabase Pooler transaction mode URL)
  - [ ] Add `SYSTEM_USER_ID` to `.env.example`
  - [ ] Add `KV_REST_API_URL` and `KV_REST_API_TOKEN` to `.env.example`
  - [ ] Update `.env.local` locally with actual values

- [ ] Task 13: Integration tests for DAL and pagination
  - [ ] Create `tests/integration/users.test.ts` — tests `getUserProfile()` with real Supabase local instance
  - [ ] Verify RLS: test that user A CANNOT read user B's profile
  - [ ] Test `validateSystemUser()` fails if `SYSTEM_USER_ID` is unset or missing from DB
  - [ ] Test cursor pagination helper encodes/decodes correctly and returns `nextCursor: null` at end

## Dev Notes

### Tech Stack (LOCKED — do not deviate)

- **Supabase:** `@supabase/supabase-js` + `@supabase/ssr` — App Router SSR support with HTTP-only cookie sessions
- **DB Driver:** `postgres-js` (postgres) — used by Drizzle ORM; `{ prepare: false }` required for serverless/edge
- **Rate Limiting:** `@upstash/ratelimit` + `@vercel/kv` — sliding window algorithm
- **Connection Pooling:** Supabase Pooler (transaction mode) — `DATABASE_URL` is the pooler URL (not direct connection)
- **Package Manager:** `pnpm` always

### Packages to Install

```bash
pnpm add @supabase/supabase-js @supabase/ssr postgres
pnpm add @upstash/ratelimit @vercel/kv
```

### Canonical Supabase Client Patterns (AC #1 — must match exactly)

```typescript
// src/lib/supabase/server.ts — SERVICE ROLE, admin operations only
// NEVER import this in client components or user-facing Server Actions
import { createServerClient } from '@supabase/ssr'

export function createServerAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}
```

```typescript
// src/lib/supabase/user.ts — ANON KEY, all regular app queries
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createUserClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {
            // Ignore cookie errors in RSC (read-only context)
          }
        },
      },
    }
  )
}
```

### Canonical Middleware Pattern (AC #3 — required for session refresh)

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

const authRatelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
})

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Supabase session refresh (MUST run on every request)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // IMPORTANT: do NOT call supabase.auth.getSession() — use getUser() (validates with Supabase server)
  await supabase.auth.getUser()

  // Auth rate limiting (FR62, NFR-SEC7)
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success } = await authRatelimit.limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'RATE_LIMIT_EXCEEDED' }, { status: 429 })
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

**CRITICAL:** Always use `supabase.auth.getUser()` (never `getSession()`) for server-side auth checks. `getSession()` reads from cookie without server validation — a security risk.

### Canonical Drizzle DB Client (AC #8)

```typescript
// src/server/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Transaction mode pooler — { prepare: false } required for serverless
const client = postgres(process.env.DATABASE_URL!, { prepare: false })

export const db = drizzle(client, { schema, casing: 'camelCase' })

// Re-export schema for use in DAL queries
export * from './schema'
```

`DATABASE_URL` = Supabase Pooler transaction mode URL (found in Supabase dashboard → Settings → Database → Connection Pooling → Transaction mode).

### Canonical Schema Files (AC #4 — exact structure required)

All schemas follow the patterns from `_bmad-output/planning-artifacts/architecture.md#Data Architecture`. Copy schemas exactly — they are locked by the architecture document.

**`src/server/db/schema/users.ts`** (key tables):
```typescript
import { pgTable, uuid, text, boolean, timestamp, jsonb, date, integer, unique } from 'drizzle-orm/pg-core'

export const profiles = pgTable('profiles', {
  id:               uuid('id').primaryKey(),  // references auth.users — no FK in Drizzle (Supabase manages)
  displayName:      text('display_name'),
  tier:             text('tier').notNull().default('free'),       // 'anonymous'|'free'|'pro'|'team_member'|'team_admin'
  previousTier:     text('previous_tier'),
  isAdmin:          boolean('is_admin').notNull().default(false),
  formatPreferences: jsonb('format_preferences'),                  // FormatPreferences | null
  userFsrsParams:   jsonb('user_fsrs_params'),                    // number[21] | null
  gdprConsentAt:    timestamp('gdpr_consent_at', { withTimezone: true }),
  deletedAt:        timestamp('deleted_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const systemConfig = pgTable('system_config', {
  id:                  text('id').primaryKey().default('global'),
  aiFreeeTierEnabled:  boolean('ai_free_tier_enabled').notNull().default(true),
  updatedAt:           timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy:           uuid('updated_by').references(() => profiles.id),
})

export const aiUsage = pgTable('ai_usage', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  monthStart:   date('month_start').notNull(),
  count:        integer('count').notNull().default(0),
}, (t) => ({ uniq: unique().on(t.userId, t.monthStart) }))

export const anonymousSessions = pgTable('anonymous_sessions', {
  id:             uuid('id').primaryKey().defaultRandom(),
  supabaseAnonId: uuid('supabase_anon_id').notNull().unique(),
  linkedAt:       timestamp('linked_at', { withTimezone: true }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const processedWebhookEvents = pgTable('processed_webhook_events', {
  id:          uuid('id').primaryKey().defaultRandom(),
  webhookId:   text('webhook_id').notNull().unique(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
})

export const analyticsEvents = pgTable('analytics_events', {
  id:        uuid('id').primaryKey().defaultRandom(),
  eventName: text('event_name').notNull(),
  userId:    uuid('user_id').references(() => profiles.id),
  metadata:  jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

**`src/server/db/schema/decks.ts`** — see architecture.md for exact decks, notes, deckShares schemas.

**`src/server/db/schema/cards.ts`** — `cardModeEnum`, `cards` with all FSRS-6 fields. `cardModeEnum` is the pgEnum definition; `CardMode` TS type lives in `src/types/index.ts` (NEVER in schema files).

**`src/server/db/schema/reviews.ts`** — `reviews` table with `presentationMode` using `cardModeEnum`.

**`src/server/db/schema/teams.ts`** — `teams`, `teamMembers`, `pendingInvites` (with `isRevoked` field), `teamDeckAssignments`.

**Drizzle Relations — co-location rule (CRITICAL):**
Relations are defined in the SAME FILE as their primary table and exported as `{table}Relations`. Never define relations in a separate file. `src/server/db/index.ts` re-exports both schema tables and relations.

### Canonical DAL Pattern (AC #2)

```typescript
// src/server/db/queries/users.ts
import { db } from '@/server/db'
import { profiles } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import type { Result } from '@/types'

export async function getUserProfile(userId: string): Promise<Result<typeof profiles.$inferSelect>> {
  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
    })
    if (!profile) return { data: null, error: { message: 'Profile not found', code: 'NOT_FOUND' } }
    return { data: profile, error: null }
  } catch (err) {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
```

**DAL Rules (NON-NEGOTIABLE):**
- All functions return `Result<T>` — NEVER throw
- All `find*` (list) functions include `where(isNull(table.deletedAt))` for soft-delete filtering
- Import `Result` from `@/types` — never redefine it
- Import `db` from `@/server/db` — never instantiate Drizzle outside this file
- Use typed Drizzle queries via `db.query.*` or `db.select().from()` — never raw SQL

### Canonical Cursor Pagination Helper (AC #5)

```typescript
// src/lib/pagination.ts
export interface PaginationInput {
  limit: number       // page size (suggest default 20, max 100)
  cursor?: string     // base64-encoded cursor; undefined = first page
}

export interface PaginationResult<T> {
  items: T[]
  nextCursor: string | null  // null = no more pages
}

// Encode: base64url of ISO timestamp (or any string cursor value)
export function encodeCursor(value: string): string {
  return Buffer.from(value).toString('base64url')
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf-8')
}
```

**Usage in DAL:** Fetch `limit + 1` items; if `items.length > limit`, slice to `limit` and set `nextCursor = encodeCursor(items[limit].createdAt.toISOString())`.

### Canonical RLS SQL Pattern (AC #4)

```sql
-- supabase/migrations/rls/profiles_rls.sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can read all profiles (for team management, admin dashboard)
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
```

**RLS Trust Model:**
- `profiles.tier` is the single source of truth for RBAC — RLS policies reference it via `auth.uid()` join
- Anonymous users (`tier = 'anonymous'`) can ONLY read system-user-owned decks (cold start deck)
- Service role (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS — only used in Edge Functions and migrations/seed
- Never use service role key in client-side or user-facing Server Actions

### Anonymous Session GDPR Cleanup Edge Function (AC #6)

```typescript
// supabase/functions/purge-anonymous-sessions/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Find unconverted sessions older than 30 days
  const { data: sessions } = await supabase
    .from('anonymous_sessions')
    .select('id, supabase_anon_id')
    .is('linked_at', null)
    .lt('created_at', cutoff)

  if (!sessions?.length) return new Response('No sessions to purge', { status: 200 })

  for (const session of sessions) {
    // Hard-delete reviews first (FK constraint)
    await supabase.from('reviews').delete().eq('user_id', session.supabaseAnonId)
    // Delete anonymous_sessions row
    await supabase.from('anonymous_sessions').delete().eq('id', session.id)
    // Sign out from Supabase Auth (cleans up auth.users row)
    await supabase.auth.admin.deleteUser(session.supabaseAnonId)
  }

  return new Response(`Purged ${sessions.length} sessions`, { status: 200 })
})
```

```toml
# supabase/functions/purge-anonymous-sessions/config.toml
[functions.purge-anonymous-sessions]
schedule = "0 3 * * *"  # Daily at 03:00 UTC
```

### linkIdentity() ADR Template (AC #7)

Create `docs/adr/001-link-identity-race-condition.md`:

```markdown
# ADR-001: Supabase linkIdentity() Race Condition — Anonymous to Auth Upgrade

## Status: Accepted

## Context
When an anonymous user clicks the signup CTA, `supabase.auth.linkIdentity()` is called to
upgrade the anonymous session to a registered account. A race condition can occur if:
1. User initiates signup in two browser tabs simultaneously
2. Network timeout causes the client to retry linkIdentity() while a prior call is still in-flight
3. Anonymous session expires between study completion and signup

## Findings from Spike
[Document your findings here after running the spike. Key questions to answer:]
- What does Supabase return on concurrent linkIdentity() calls for the same anonymous session?
- Does the second call fail with a specific error code that the client can detect?
- Is there an idempotency guarantee on the Supabase side?

## Decision
[State the confirmed mitigation strategy here. Recommended approach:]
Implement optimistic locking: before calling linkIdentity(), check if the anonymous session
is still valid via supabase.auth.getUser(). If the session has already been upgraded (user
exists with linked identity), skip linkIdentity() and redirect to library. Log the event
via log({ action: 'auth.link_identity.conflict', userId }) for debugging.

## Implementation Notes
- Story 1.6 implements the actual linkIdentity() call based on this ADR
- Any conflict detection in Story 1.6 MUST log via log() (see logger.ts)
- The `anonymous_sessions.linked_at` column is set to NOW() on successful upgrade
```

### Seed SQL for System User (AC #9)

```sql
-- supabase/seed.sql
-- System user for cold start deck (FR1)
-- Run ONCE during initial setup. SYSTEM_USER_ID must match the generated UUID.
-- CRITICAL: Never delete this user from Supabase Auth — cold start breaks silently.

INSERT INTO auth.users (
  id,
  email,
  role,
  aud,
  created_at,
  updated_at,
  is_super_admin,
  encrypted_password
) VALUES (
  gen_random_uuid(),    -- COPY THIS UUID → set as SYSTEM_USER_ID env var
  'system@internal.flashcards.app',
  'authenticated',
  'authenticated',
  now(),
  now(),
  false,
  ''   -- locked account — no password login possible
);

-- Insert matching profiles row (ON CONFLICT DO NOTHING for idempotency)
INSERT INTO profiles (id, display_name, tier, is_admin)
SELECT id, 'System', 'free', false
FROM auth.users WHERE email = 'system@internal.flashcards.app'
ON CONFLICT (id) DO NOTHING;
```

### validateSystemUser() Startup Guard (AC #10)

```typescript
// src/server/db/queries/users.ts — add this function
export async function validateSystemUser(): Promise<void> {
  const systemUserId = process.env.SYSTEM_USER_ID
  if (!systemUserId) {
    throw new Error('[STARTUP] SYSTEM_USER_ID env var is not set — cold start deck will be broken')
  }
  const result = await getUserProfile(systemUserId)
  if (result.error) {
    throw new Error(`[STARTUP] System user ${systemUserId} not found in profiles — run seed.sql`)
  }
}
```

```typescript
// next.config.ts — add server-side startup validation
// Add inside the config object (not in headers/redirects):
// NOTE: Only fires on server start; no user impact if it fails in production
// (Vercel will fail the deployment health check instead of silently serving broken cold start)
import { validateSystemUser } from '@/server/db/queries/users'

// Call in next.config.ts server instrumentation block:
if (typeof window === 'undefined') {
  validateSystemUser().catch(console.error)
}
```

### Rate Limiting Helper (AC #11)

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

// Reusable factory — creates a rate limiter per window config
export function createRateLimiter(maxAttempts: number, windowDuration: `${number} s` | `${number} m` | `${number} h`) {
  return new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(maxAttempts, windowDuration),
  })
}

// Pre-configured limiters for known use cases
export const authLimiter = createRateLimiter(10, '15 m')          // NFR-SEC7: auth brute-force
export const aiGenerationLimiter = createRateLimiter(3, '1 m')    // burst throttle (free users)
export const teamInviteLimiter = createRateLimiter(20, '1 h')     // INVITE_RATE_LIMIT constant

// Wrapper that returns Result<void>
export async function rateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number }> {
  const { success, remaining } = await limiter.limit(identifier)
  return { success, remaining }
}
```

### Updated .env.example (AC #12)

Add these vars to the existing `.env.example` created in Story 1.1:

```bash
# Database (Supabase Pooler — transaction mode)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

# System User (set after running seed.sql — UUID from auth.users insert)
SYSTEM_USER_ID=

# Vercel KV / Upstash (rate limiting)
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

### Story Definition of Done (applies to this story)

A story is complete when ALL are true:
1. Tests — integration tests written and passing against local Supabase (`supabase start`)
2. Result type — all DAL functions return `Result<T>`; no thrown exceptions
3. `.env.example` — all new env vars added with comments
4. Soft-delete filter — all `find*` list queries include `isNull(table.deletedAt)`
5. RLS — every new table has an RLS SQL file in `supabase/migrations/rls/`
6. No raw Drizzle in components, pages, or route handlers — all via DAL wrappers

### Project Structure Notes

New files created in this story:
```
src/
  lib/
    supabase/
      server.ts      ← NEW: createServerAdminClient() (service role)
      user.ts        ← NEW: createUserClient() (anon key + cookies)
    pagination.ts    ← NEW: PaginationInput, PaginationResult<T>, encode/decodeCursor
    rate-limit.ts    ← NEW: rate limiter factory + pre-configured limiters
  middleware.ts      ← NEW: session refresh + auth rate limiting (project root src/)
  server/
    db/
      index.ts       ← UPDATED: complete Drizzle client with postgres-js
      schema/
        users.ts     ← NEW: profiles, systemConfig, aiUsage, anonymousSessions, processedWebhookEvents, analyticsEvents
        decks.ts     ← NEW: decks, notes, deckShares + relations
        cards.ts     ← NEW: cardModeEnum, cards + relations
        reviews.ts   ← NEW: reviews + relations
        teams.ts     ← NEW: teams, teamMembers, pendingInvites, teamDeckAssignments + relations
        index.ts     ← UPDATED: re-export all schemas
      queries/
        users.ts     ← NEW: getUserProfile(), validateSystemUser(), updateProfileTier()
        decks.ts     ← NEW: findDecksByUserId(), getDeckById()
        cards.ts     ← NEW: findCardsDue()
        reviews.ts   ← NEW: createReview()
        teams.ts     ← NEW: getTeamById()
docs/
  adr/
    001-link-identity-race-condition.md  ← NEW: spike findings + mitigation
supabase/
  migrations/        ← POPULATED: Drizzle-generated migration files
  migrations/rls/
    profiles_rls.sql         ← NEW
    decks_rls.sql            ← NEW
    cards_rls.sql            ← NEW
    reviews_rls.sql          ← NEW
    anonymous_sessions_rls.sql ← NEW
    system_config_rls.sql    ← NEW
    analytics_events_rls.sql ← NEW
  functions/
    purge-anonymous-sessions/
      index.ts         ← NEW: Edge Function
      config.toml      ← NEW: cron schedule
  seed.sql             ← NEW: system user
tests/
  integration/
    users.test.ts      ← NEW
```

**IMPORTANT — middleware.ts placement:** `src/middleware.ts` (inside `src/` not in project root). Next.js App Router looks for middleware in `src/` when `src/` directory exists.

**IMPORTANT — no shadcn/ui yet:** Do NOT run `npx shadcn@latest init` in this story. shadcn is added in Story 1.4 when the first visible UI is built.

### Architecture Compliance Checklist (Anti-Disaster)

- [ ] `createServerAdminClient()` is NEVER called from client components or user-facing code
- [ ] `createUserClient()` uses ANON KEY — not service role key
- [ ] Middleware calls `supabase.auth.getUser()` — NOT `getSession()`
- [ ] All DAL functions return `Result<T>` — no throws, no raw Drizzle in pages
- [ ] `cardModeEnum` is in `schema/cards.ts`; `CardMode` TS type stays in `src/types/index.ts`
- [ ] Drizzle relations co-located with their table schema (never separate file)
- [ ] `src/server/db/index.ts` uses `{ prepare: false }` — required for Supabase Pooler
- [ ] All list DAL queries include `isNull(table.deletedAt)` soft-delete filter
- [ ] RLS enabled on all new tables — service role bypasses for seeding/Edge Functions only
- [ ] `SYSTEM_USER_ID` is NOT hardcoded anywhere — always read from `process.env`
- [ ] `.env.example` updated; `.env.local` is in `.gitignore`
- [ ] linkIdentity() ADR written BEFORE Story 1.6 proceeds — mitigation must be confirmed

### Previous Story (1.1) Intelligence

Story 1.1 established:
- `src/server/db/index.ts` exists as a PLACEHOLDER (no real connection) — this story completes it
- `drizzle.config.ts` is configured with `casing: 'camelCase'`, `dialect: 'postgresql'`, `schema: './src/server/db/schema'`, `out: './supabase/migrations'`
- `src/types/index.ts` has `Result<T>` and `CardMode` — import from `@/types`, never redefine
- `src/types/errors.ts` has `ErrorCodes` — use existing `NOT_FOUND`, `UNAUTHORIZED`
- `src/lib/constants.ts` has `INVITE_EXPIRY_DAYS = 7`, `INVITE_RATE_LIMIT = 20` — reference these in rate limiter config
- `src/lib/logger.ts` has `log()` — use for any auth events or DB errors
- `.env.example` already has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — these are already documented, just need actual values in `.env.local`
- **Do NOT** install `ts-fsrs` — that belongs to Study Session stories

### References

- Supabase client split pattern: `_bmad-output/planning-artifacts/architecture.md#Authentication & Security`
- Data schemas (canonical): `_bmad-output/planning-artifacts/architecture.md#Data Architecture`
- RLS trust model: `_bmad-output/planning-artifacts/architecture.md#Authentication & Security`
- Rate limiting config: `_bmad-output/planning-artifacts/architecture.md#Authentication & Security`
- Cold start system user: `_bmad-output/planning-artifacts/architecture.md#Cold Start → Auth Handoff`
- Anonymous session cleanup: `_bmad-output/planning-artifacts/architecture.md#Data Architecture` (anonymous_sessions table)
- Cursor pagination: `_bmad-output/planning-artifacts/epics.md#Story 1.2 Acceptance Criteria`
- ARCH2, ARCH5, ARCH6, ARCH11, ARCH14, ARCH15: `_bmad-output/planning-artifacts/epics.md#Additional Requirements`
- DAL verb conventions: `_bmad-output/planning-artifacts/architecture.md#Naming Patterns`
- Learning Fingerprint two-layer model: `_bmad-output/planning-artifacts/architecture.md#Data Architecture`
- FormatPreferences type: `_bmad-output/planning-artifacts/architecture.md#Data Architecture`
- Story 1.1 (previous story): `_bmad-output/implementation-artifacts/1-1-project-scaffold-and-core-infrastructure-setup.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
