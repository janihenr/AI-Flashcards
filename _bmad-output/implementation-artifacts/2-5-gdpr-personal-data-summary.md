# Story 2.5: GDPR Personal Data Summary

Status: done

## Story

As a registered user,
I want to request a human-readable summary of all data stored about me,
So that I understand what personal data the system holds.

## Acceptance Criteria

1. **Given** I am on the privacy settings page **When** I request a data summary **Then** the summary is displayed in-app immediately (no async job — synchronous fetch and render)

2. **Given** the summary is displayed **Then** it lists all data categories:
   - Profile fields (display name, tier, GDPR consent date, account creation date)
   - Deck count (non-deleted)
   - Card count (all user cards)
   - Study history (total review count)
   - Learning Fingerprint signals (format preferences: yes/no; custom FSRS params: yes/no)
   - Subscription tier
   - Active session count
   - An explicit statement that payment card data is not stored by the app (managed by Stripe)

3. **Given** the summary is displayed **Then** it explicitly states: "Payment card data is managed by Stripe and is not stored by Flashcards."

## Dependency

**Story 2.4 MUST be complete before starting this story.** Story 2.4 creates `src/app/(app)/settings/privacy/page.tsx` and `src/components/privacy/DataExportSection.tsx`. This story adds a second section to that same page. If Story 2.4 is still in progress, coordinate or branch from it.

## Tasks / Subtasks

### Task 1: Add data summary queries to the privacy page (AC: #1, #2)

- [x] Modify `src/app/(app)/settings/privacy/page.tsx` to add four Drizzle count queries and one Supabase admin session count — run in parallel via `Promise.all` for performance:

  ```typescript
  import { count, eq, isNull, and } from 'drizzle-orm'
  import { decks, notes, cards } from '@/server/db/schema'
  // notes is re-exported from @/server/db/schema — co-located in decks.ts
  import { reviews } from '@/server/db/schema'

  // Inside PrivacySettingsPage():
  const [
    [{ deckCount }],
    [{ noteCount }],
    [{ cardCount }],
    [{ reviewCount }],
    sessionsResult,
  ] = await Promise.all([
    db.select({ deckCount: count() })
      .from(decks)
      .where(and(eq(decks.userId, user!.id), isNull(decks.deletedAt))),
    db.select({ noteCount: count() })
      .from(notes)
      .where(and(eq(notes.userId, user!.id), isNull(notes.deletedAt))),
    db.select({ cardCount: count() })
      .from(cards)
      .where(eq(cards.userId, user!.id)),
    db.select({ reviewCount: count() })
      .from(reviews)
      .where(eq(reviews.userId, user!.id)),
    adminClient
      .schema('auth')
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id),
  ])
  const activeSessionCount = sessionsResult.count ?? 0
  ```

  Note: `adminClient` is already constructed in the page for the data export signed URL — reuse the same instance, do NOT call `createServerAdminClient()` twice. Place `Promise.all` after `adminClient` is created.

- [x] Pass summary data to `<DataSummarySection>` as props (see Task 2).

### Task 2: Create `DataSummarySection` component (AC: #1, #2, #3)

- [x] Create `src/components/privacy/DataSummarySection.tsx` (Server Component — no client state, no actions):

  Props interface:
  ```typescript
  interface DataSummarySectionProps {
    profile: {
      displayName: string | null
      tier: string
      gdprConsentAt: Date | null
      createdAt: Date
      hasFormatPreferences: boolean   // formatPreferences !== null
      hasCustomFsrsParams: boolean    // userFsrsParams !== null
    }
    counts: {
      decks: number
      notes: number
      cards: number
      reviews: number
      activeSessions: number
    }
  }
  ```

  Display layout (section pattern from Stories 2.2, 2.3, 2.4):
  ```tsx
  export function DataSummarySection({ profile, counts }: DataSummarySectionProps) {
    return (
      <dl className="text-sm flex flex-col gap-3">
        {/* Profile */}
        <div>
          <dt className="font-medium">Display name</dt>
          <dd className="text-muted-foreground">{profile.displayName ?? '(not set)'}</dd>
        </div>
        <div>
          <dt className="font-medium">Subscription tier</dt>
          <dd className="text-muted-foreground capitalize">{profile.tier}</dd>
        </div>
        <div>
          <dt className="font-medium">Account created</dt>
          <dd className="text-muted-foreground">{profile.createdAt.toLocaleDateString()}</dd>
        </div>
        <div>
          <dt className="font-medium">GDPR consent given</dt>
          <dd className="text-muted-foreground">
            {profile.gdprConsentAt ? profile.gdprConsentAt.toLocaleDateString() : 'Not recorded'}
          </dd>
        </div>

        {/* Decks & Content */}
        <div>
          <dt className="font-medium">Decks</dt>
          <dd className="text-muted-foreground">{counts.decks} deck{counts.decks !== 1 ? 's' : ''}</dd>
        </div>
        <div>
          <dt className="font-medium">Notes</dt>
          <dd className="text-muted-foreground">{counts.notes} note{counts.notes !== 1 ? 's' : ''}</dd>
        </div>
        <div>
          <dt className="font-medium">Cards</dt>
          <dd className="text-muted-foreground">{counts.cards} card{counts.cards !== 1 ? 's' : ''}</dd>
        </div>

        {/* Study History */}
        <div>
          <dt className="font-medium">Study reviews</dt>
          <dd className="text-muted-foreground">{counts.reviews} review{counts.reviews !== 1 ? 's' : ''}</dd>
        </div>

        {/* Learning Fingerprint */}
        <div>
          <dt className="font-medium">Learning Fingerprint — format preferences</dt>
          <dd className="text-muted-foreground">{profile.hasFormatPreferences ? 'Stored' : 'Not yet collected'}</dd>
        </div>
        <div>
          <dt className="font-medium">Learning Fingerprint — custom FSRS parameters</dt>
          <dd className="text-muted-foreground">{profile.hasCustomFsrsParams ? 'Stored' : 'Not yet collected'}</dd>
        </div>

        {/* Sessions */}
        <div>
          <dt className="font-medium">Active sessions</dt>
          <dd className="text-muted-foreground">{counts.activeSessions} active session{counts.activeSessions !== 1 ? 's' : ''}</dd>
        </div>

        {/* Payment statement — required by AC #3 */}
        <div>
          <dt className="font-medium">Payment data</dt>
          <dd className="text-muted-foreground">
            Payment card data is managed by Stripe and is not stored by Flashcards.
          </dd>
        </div>
      </dl>
    )
  }
  ```

### Task 3: Wire up the section in the privacy page (AC: #1, #2, #3)

- [x] In `src/app/(app)/settings/privacy/page.tsx`, add the summary section below the export section:

  ```tsx
  import { DataSummarySection } from '@/components/privacy/DataSummarySection'

  // In PrivacySettingsPage() return JSX:
  <section aria-labelledby="summary-heading" className="flex flex-col gap-4">
    <h2 id="summary-heading" className="text-base font-medium">Your Data Summary</h2>
    <p className="text-sm text-muted-foreground">
      An overview of all personal data stored about you in Flashcards.
    </p>
    <DataSummarySection
      profile={{
        displayName: profile.displayName,
        tier: profile.tier,
        gdprConsentAt: profile.gdprConsentAt,
        createdAt: profile.createdAt,
        hasFormatPreferences: profile.formatPreferences !== null,
        hasCustomFsrsParams: profile.userFsrsParams !== null,
      }}
      counts={{
        decks: deckCount,
        notes: noteCount,
        cards: cardCount,
        reviews: reviewCount,
        activeSessions: activeSessionCount,
      }}
    />
  </section>
  ```

  **Important:** The `profile` object in the page already fetches data for the export section. Ensure these new fields are included in the existing profile query (Story 2.4's page fetches minimal profile fields — extend the `select()` if needed):

  Story 2.4's page fetches profile via `userClient.auth.getUser()` for `user.id` but loads profile data via Drizzle. If Story 2.4 does NOT already load the `profiles` row, add:
  ```typescript
  import { profiles } from '@/server/db/schema'
  const [profileRow] = await db.select().from(profiles).where(eq(profiles.id, user!.id))
  ```

  If Story 2.4 already loads the profile row, reuse it — do NOT query profiles twice.

### Task 4: Tests (AC: #1, #2, #3)

- [x] Create `tests/integration/data-summary.test.ts`:

  Key test cases:
  - When profile has `formatPreferences = null` → `hasFormatPreferences: false`
  - When profile has `formatPreferences = { qa: 0.5 }` → `hasFormatPreferences: true`
  - When profile has `userFsrsParams = null` → `hasCustomFsrsParams: false`
  - When profile has `userFsrsParams = [...]` → `hasCustomFsrsParams: true`
  - Count queries return correct values from mocked DB
  - Session count falls back to `0` when `sessionsResult.count` is `null`

  Mock pattern (same as Story 2.4):
  ```typescript
  vi.mock('@/lib/supabase/user', () => ({ createUserClient: vi.fn() }))
  vi.mock('@/lib/supabase/server', () => ({ createServerAdminClient: vi.fn() }))
  vi.mock('@/server/db', () => ({ db: mockDb }))
  ```

  For the admin client sessions query mock:
  ```typescript
  const mockAdminClient = {
    schema: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
    storage: { from: vi.fn().mockReturnThis(), createSignedUrl: vi.fn().mockResolvedValue({ data: null }) },
  }
  ```

## Dev Notes

### Architecture Compliance

- **No new DB tables.** This story is pure read — queries existing tables, no writes.
- **Auth pattern:** `getUser()` via user client first; never trust client-provided userId.
- **`(app)` layout auth guard:** Already handled; no additional redirect needed.
- **No Server Action needed:** Summary is rendered server-side in the RSC on page load — no button-triggered fetch.
- **No `revalidatePath`:** The page re-renders fresh on each navigation.
- **Structured logging:** Not required for read-only queries (no failure paths needing FR54 logging).

### Drizzle `count()` — Verified API (Context7)

```typescript
import { count, eq, isNull, and } from 'drizzle-orm'

// Returns [{ deckCount: number }] — count() auto-casts to number
const [{ deckCount }] = await db
  .select({ deckCount: count() })
  .from(decks)
  .where(and(eq(decks.userId, userId), isNull(decks.deletedAt)))
```

The `count()` helper is available from `'drizzle-orm'` and automatically handles PostgreSQL bigint-to-number casting. No `sql<number>` casting needed.

### CRITICAL: `notes` Table Location

`notes` is defined in `src/server/db/schema/decks.ts`, NOT in a separate file. **Always import `notes` from `@/server/db/schema` (the re-export barrel) — NEVER from `./notes` or `@/server/db/schema/notes` — those files do not exist and will cause a runtime error.**

### Database Schema Quick Reference

| Table | Columns used | Filter |
|---|---|---|
| `profiles` | `displayName`, `tier`, `gdprConsentAt`, `createdAt`, `formatPreferences`, `userFsrsParams` | `id = userId` |
| `decks` | `count()` | `userId = userId AND deletedAt IS NULL` |
| `notes` | `count()` | `userId = userId AND deletedAt IS NULL` (co-located in `decks.ts`) |
| `cards` | `count()` | `userId = userId` (no soft-delete on cards) |
| `reviews` | `count()` | `userId = userId` (hard-delete on GDPR erasure; all present are valid) |
| `auth.sessions` | `count` (exact) | `user_id = userId` (Supabase admin schema query) |

### Active Session Count — Supabase Admin Schema Query

```typescript
const adminClient = createServerAdminClient()  // re-used from export signed URL block
const { count: sessionCount } = await adminClient
  .schema('auth')
  .from('sessions')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
const activeSessionCount = sessionCount ?? 0
```

`head: true` sends a `HEAD` request — no rows returned, only the `count` header. This is the same admin pattern used in Story 2.3's `security/page.tsx`.

### Privacy Page Structure (Post-2.4 Expectations)

After Story 2.4, `page.tsx` looks like:
```tsx
<main className="max-w-xl mx-auto p-4 flex flex-col gap-8">
  <h1 className="text-xl font-semibold">Privacy Settings</h1>

  {/* Story 2.4 — Export section */}
  <section aria-labelledby="export-heading" className="flex flex-col gap-4">
    <h2 id="export-heading" className="text-base font-medium">Your Personal Data</h2>
    ...
    <DataExportSection job={latestJob} downloadUrl={downloadUrl} />
  </section>

  {/* THIS STORY — Summary section appended here */}
  <section aria-labelledby="summary-heading" className="flex flex-col gap-4">
    ...
    <DataSummarySection ... />
  </section>
</main>
```

Story 2.6 (Account Deletion) will add a third section after this one. Do NOT add stubs or placeholders for 2.6.

### `adminClient` Reuse — Do NOT Double-Instantiate

Story 2.4's page already calls `createServerAdminClient()` to generate the signed download URL. Story 2.5 adds session count via the same admin client. Declare `adminClient` once and reuse:

```typescript
// Good — single instantiation
const adminClient = createServerAdminClient()

// Bad — do NOT do this
const adminClient1 = createServerAdminClient()  // for signed URL
const adminClient2 = createServerAdminClient()  // for session count
```

### `Promise.all` Parallel Queries

The five count queries and the existing `data_export_jobs` query in 2.4 are all independent. Place them in a single `Promise.all` to avoid sequential waterfall. If Story 2.4's page already uses `Promise.all` for the job query, add the five new queries to that same call. If it's sequential, restructure to parallel.

### File Structure

**New files:**
- `src/components/privacy/DataSummarySection.tsx`
- `tests/integration/data-summary.test.ts`

**Modified files:**
- `src/app/(app)/settings/privacy/page.tsx` — add 5 count queries + `<DataSummarySection>` section

### Previous Story Learnings (from Stories 2.1–2.4)

- **Section pattern:** `<section aria-labelledby="X-heading">` with `<h2 id="X-heading">` — WCAG landmark pattern used in 2.2, 2.3, 2.4
- **`createUserClient()`** from `@/lib/supabase/user`; **`createServerAdminClient()`** from `@/lib/supabase/server`
- **`(app)` layout** auth guard covers this page; still call `getUser()` to obtain `user.id`
- **No `revalidatePath`** for read-only page refresh — full RSC re-render on navigation
- **`adminClient.schema('auth').from('sessions')`** — direct Supabase PostgREST schema query (confirmed working in Story 2.3)
- **Profile data:** `profiles.formatPreferences` and `profiles.userFsrsParams` are `jsonb` columns; test for `!== null` to determine if Learning Fingerprint data exists
- **Soft-delete on decks/notes:** filter `isNull(decks.deletedAt)` — required to exclude deleted content from counts
- **No soft-delete on cards/reviews:** count all rows without a `deletedAt` filter

### Cross-Story Awareness

- **Story 2.6 (Account Deletion):** Will add a third section to `/settings/privacy`. Leave a clean `</section>` boundary after the summary section.
- **Story 9.x (Admin observability):** No structured logging added here; this is read-only.
- **`adminClient` pattern:** Established in Stories 2.3 and 2.4 — service-role client, server-only, never exposed to client.

### References

- Epic 2 Story 2.5 acceptance criteria [Source: `_bmad-output/planning-artifacts/epics.md#Story-2.5`]
- Architecture: Privacy settings page structure [Source: `_bmad-output/planning-artifacts/architecture.md`]
- Architecture: Soft-delete pattern — `isNull(table.deletedAt)` on decks and notes [Source: `_bmad-output/planning-artifacts/architecture.md`]
- Architecture: `notes` table co-located in `src/server/db/schema/decks.ts` [Source: `_bmad-output/planning-artifacts/architecture.md`]
- Story 2.3 session patterns [Source: `_bmad-output/implementation-artifacts/2-3-active-session-view-and-revocation.md`]
- Story 2.4 privacy page structure, `adminClient` pattern, section layout [Source: `_bmad-output/implementation-artifacts/2-4-gdpr-personal-data-export.md`]
- Context7: Drizzle ORM `count()` aggregate — `import { count } from 'drizzle-orm'`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

N/A — no errors or debugging required.

### Completion Notes List

- `adminClient` was hoisted to the top of `PrivacySettingsPage` (before `Promise.all`) so it could be reused for both the sessions count query and the conditional signed-URL generation — no double-instantiation.
- All 6 DB queries (jobs, profiles, 4 counts) plus the admin sessions query run in a single `Promise.all` for parallel execution.
- Integration tests use React element tree traversal (inspecting `React.ReactElement.props`) rather than rendering, keeping the test environment pure Node.js without jsdom.

### File List

**New files:**
- `src/components/privacy/DataSummarySection.tsx`
- `tests/integration/data-summary.test.ts`

**Modified files:**
- `src/app/(app)/settings/privacy/page.tsx`
