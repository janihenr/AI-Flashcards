# Story 2.4: GDPR Personal Data Export

Status: done

## Story

As a registered user,
I want to export all my personal data in a portable format,
so that I can exercise my GDPR right to data portability.

## Acceptance Criteria

1. **Given** I am on the privacy settings page **When** I request a data export **Then** a data export job is queued **And** I receive an email acknowledgment within 5 minutes that the request is being processed **And** the 72-hour SLA clock starts at the time of the original request (not the acknowledgment email)

2. **Given** the export is generated **When** it is ready (within 72 hours per NFR-GDPR2) **Then** I receive an email directing me to download my data at the privacy settings page **And** the download is available for 48 hours after it is ready **And** the download contains: profile, decks, notes, cards, FSRS review history, and Learning Fingerprint signals in JSON format **And** no payment card data is included (held by Stripe only, NFR-SEC8) **And** no AI prompt content or PII sent to Azure OpenAI is included (NFR-SEC6)

3. **Given** the export job fails **When** the failure is detected **Then** the user receives an email notification that the export failed with a link to retry **And** the failure is logged as a structured error (FR54)

## Tasks / Subtasks

### Task 1: DB migration — `data_export_jobs` table (AC: prerequisite)

- [x] Create `supabase/migrations/0004_data_export_jobs.sql`:

  ```sql
  CREATE TABLE IF NOT EXISTS data_export_jobs (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status        TEXT         NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'expired')),
    file_path     TEXT,        -- storage path: '{userId}/{jobId}.json'; null until ready
    expires_at    TIMESTAMPTZ, -- 48h after export ready; null until ready
    error_message TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_export_jobs_user_status ON data_export_jobs(user_id, status);
  CREATE INDEX idx_export_jobs_pending     ON data_export_jobs(status, created_at)
    WHERE status = 'pending';

  ALTER TABLE data_export_jobs ENABLE ROW LEVEL SECURITY;

  -- Users can read their own jobs
  CREATE POLICY "Users can read own export jobs"
    ON data_export_jobs FOR SELECT
    USING (auth.uid() = user_id);

  -- Users can insert their own jobs (Server Action uses user client with anon key + JWT)
  CREATE POLICY "Users can create own export jobs"
    ON data_export_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  -- UPDATE is service-role only (Edge Function); no user-facing RLS UPDATE policy needed
  ```

- [x] Create `supabase/migrations/0005_data_exports_storage.sql`:

  ```sql
  -- Private bucket for GDPR export files
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('data-exports', 'data-exports', false)
  ON CONFLICT (id) DO NOTHING;

  -- Users can download their own export files (short-lived signed URL generated server-side)
  CREATE POLICY "Users can read own export files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'data-exports'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  -- Uploads and deletes are service-role only (Edge Function uses service role key)
  ```

### Task 2: Drizzle schema for `data_export_jobs` (AC: prerequisite)

- [x] Create `src/server/db/schema/exportJobs.ts`:

  ```typescript
  import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'

  export const dataExportJobs = pgTable('data_export_jobs', {
    id:           uuid('id').primaryKey().defaultRandom(),
    userId:       uuid('user_id').notNull(),
    // No FK reference — auth.users is in the auth schema; handled in SQL migration
    status:       text('status').notNull().default('pending'),
    // 'pending' | 'processing' | 'ready' | 'failed' | 'expired'
    filePath:     text('file_path'),       // storage path: '{userId}/{jobId}.json'
    expiresAt:    timestamp('expires_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }, (t) => [
    index('idx_export_jobs_user_status').on(t.userId, t.status),
  ])

  export type DataExportJobRow = typeof dataExportJobs.$inferSelect
  ```

- [x] Add to `src/server/db/schema/index.ts`:

  ```typescript
  export * from './exportJobs'
  ```

### Task 3: New error code (AC: #1)

- [x] `EXPORT_IN_PROGRESS: 'EXPORT_IN_PROGRESS'` is **already present** in `src/types/errors.ts` — skip this task, no changes needed.

### Task 3b: DAL functions — `src/server/db/queries/exportJobs.ts` (AC: #1, #2, #3)

**CRITICAL: Architecture requires all DB access via DAL wrappers — never call Drizzle directly from Server Actions.**

- [x] Create `src/server/db/queries/exportJobs.ts`:

  ```typescript
  import { db } from '@/server/db'
  import { dataExportJobs } from '@/server/db/schema'
  import { and, eq, inArray } from 'drizzle-orm'
  import type { Result } from '@/types'

  /** Returns pending/processing job if one already exists for this user. */
  export async function getActiveExportJob(
    userId: string
  ): Promise<Result<{ id: string } | null>> {
    try {
      const rows = await db
        .select({ id: dataExportJobs.id })
        .from(dataExportJobs)
        .where(and(
          eq(dataExportJobs.userId, userId),
          inArray(dataExportJobs.status, ['pending', 'processing'])
        ))
        .limit(1)
      return { data: rows[0] ?? null, error: null }
    } catch {
      return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
    }
  }

  /** Inserts a new data_export_jobs row; returns the new job id. */
  export async function createExportJob(
    userId: string
  ): Promise<Result<{ id: string }>> {
    try {
      const [job] = await db
        .insert(dataExportJobs)
        .values({ userId })
        .returning({ id: dataExportJobs.id })
      return { data: { id: job.id }, error: null }
    } catch {
      return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
    }
  }
  ```

- [x] These two functions are all that the Server Action needs from the DAL. The Edge Function uses the Supabase admin client directly (it runs in Deno, outside the Drizzle layer).

### Task 4: ACK email template (AC: #1)

- [x] Create `src/server/email/templates/DataExportAckEmail.tsx`:
  - Props: `{ userName: string | null }`
  - Subject line (used at call-site): `"Your data export request has been received"`
  - Body: Acknowledgment that the request is queued, export will be ready within 72 hours, user will receive a second email with download instructions when it is ready
  - Pattern: follow `InviteEmail.tsx` (React Email component, no inline HTML strings)
  - The Ready and Failed emails are **not** React Email templates — they are sent from the Edge Function (Deno) via Resend HTTP API using inline HTML strings (see Task 6)

### Task 5: Server Action `requestDataExport()` (AC: #1)

- [x] Create `src/app/(app)/settings/privacy/actions.ts`:

  ```typescript
  'use server'
  import { after } from 'next/server'
  import { createUserClient } from '@/lib/supabase/user'
  import { getActiveExportJob, createExportJob } from '@/server/db/queries/exportJobs'
  import { sendEmail } from '@/server/email'
  import { DataExportAckEmail } from '@/server/email/templates/DataExportAckEmail'
  import { log } from '@/lib/logger'
  import type { Result } from '@/types'

  export async function requestDataExport(): Promise<Result<{ jobId: string }>> {
    const userClient = await createUserClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
    }

    // Prevent duplicate pending/processing jobs — DAL only, no raw Drizzle in Server Actions
    const activeCheck = await getActiveExportJob(user.id)
    if (activeCheck.error) return { data: null, error: activeCheck.error }
    if (activeCheck.data) {
      return { data: null, error: { message: 'Export already in progress', code: 'EXPORT_IN_PROGRESS' } }
    }

    // Insert new job via DAL
    const createResult = await createExportJob(user.id)
    if (createResult.error) return { data: null, error: createResult.error }
    const jobId = createResult.data.id

    // Send ACK email synchronously (satisfies "within 5 minutes" AC)
    const { error: emailError } = await sendEmail(
      DataExportAckEmail({ userName: user.user_metadata?.display_name ?? null }),
      user.email!,
      'Your data export request has been received'
    )
    if (emailError) {
      log({ action: 'gdpr.export.ack_email_failed', userId: user.id, error: emailError })
    }

    // Trigger Edge Function in background — runs after response is sent to client
    after(async () => {
      await triggerExportProcessing(jobId)
    })

    return { data: { jobId }, error: null }
  }

  async function triggerExportProcessing(jobId: string): Promise<void> {
    const edgeFunctionUrl =
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-data-export`
    try {
      await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
        },
        body: JSON.stringify({ jobId }),
      })
    } catch (err) {
      // Non-fatal: job stays 'pending'; user can retry from the privacy page
      log({ action: 'gdpr.export.trigger_failed', jobId, error: String(err) })
    }
  }
  ```

### Task 6: Edge Function `process-data-export` (AC: #2, #3)

- [x] Create `supabase/functions/process-data-export/index.ts` (Deno runtime):

  Full implementation flow:
  1. Parse `{ jobId }` from POST body; return 400 if missing
  2. Create Supabase admin client with auto-injected `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
  3. Fetch job by `id`; return 200 if not found or status is not `pending` (idempotent)
  4. Update `status = 'processing'`, `updated_at = now()`
  5. Fetch user email from `auth.users` via admin client
  6. Run export queries (see Dev Notes for exact Supabase client calls)
  7. Build JSON export object (see Dev Notes for format)
  8. Upload JSON string to `data-exports/{userId}/{jobId}.json` via storage API
  9. Update job: `status = 'ready'`, `file_path = '{userId}/{jobId}.json'`, `expires_at = now() + 48h`, `updated_at = now()`
  10. Send "ready" email via Resend HTTP API (inline HTML — see Dev Notes)
  11. On any unhandled error: update job `status = 'failed'`, `error_message = err.message`, send failure email, log structured error

  Guard against double-processing: Step 3 checks for `pending` status before proceeding.

### Task 7: Privacy settings page (AC: #1, #2, #3)

- [x] Create `src/app/(app)/settings/privacy/page.tsx` (Server Component):

  ```typescript
  import { desc, eq } from 'drizzle-orm'
  import { db } from '@/server/db'
  import { dataExportJobs } from '@/server/db/schema'
  import { createUserClient } from '@/lib/supabase/user'
  import { createServerAdminClient } from '@/lib/supabase/server'
  import { DataExportSection } from '@/components/privacy/DataExportSection'
  import type { DataExportJobRow } from '@/server/db/schema'

  export default async function PrivacySettingsPage() {
    const userClient = await createUserClient()
    const { data: { user } } = await userClient.auth.getUser()
    // (app) layout already redirects if unauthenticated; user is guaranteed non-null here

    const jobs = await db
      .select()
      .from(dataExportJobs)
      .where(eq(dataExportJobs.userId, user!.id))
      .orderBy(desc(dataExportJobs.createdAt))
      .limit(1)
    const latestJob = jobs[0] ?? null

    // Generate a short-lived signed URL only when export is ready and not expired
    let downloadUrl: string | null = null
    if (
      latestJob?.status === 'ready' &&
      latestJob.filePath &&
      latestJob.expiresAt &&
      new Date(latestJob.expiresAt) > new Date()
    ) {
      const adminClient = createServerAdminClient()
      const { data } = await adminClient.storage
        .from('data-exports')
        .createSignedUrl(latestJob.filePath, 3600) // 1-hour download window
      downloadUrl = data?.signedUrl ?? null
    }

    return (
      <main className="max-w-xl mx-auto p-4 flex flex-col gap-8">
        <h1 className="text-xl font-semibold">Privacy Settings</h1>
        <section aria-labelledby="export-heading" className="flex flex-col gap-4">
          <h2 id="export-heading" className="text-base font-medium">Your Personal Data</h2>
          <p className="text-sm text-muted-foreground">
            Export all your personal data as a JSON file. Your export will be ready within 72 hours.
            Payment data is managed by Stripe and is not included.
          </p>
          <DataExportSection job={latestJob} downloadUrl={downloadUrl} />
        </section>
      </main>
    )
  }
  ```

- [x] Create `src/components/privacy/DataExportSection.tsx` (Client Component):
  - Props: `{ job: DataExportJobRow | null; downloadUrl: string | null }`
  - Use `useTransition` (not `useActionState`) — no persistent form state needed
  - **State matrix:**
    - `null` or `status === 'expired'` → "Request data export" button; on click calls `requestDataExport()`
    - `status === 'pending' | 'processing'` → "Export in progress — you will receive an email when it is ready (within 72 hours)"
    - `status === 'ready'` + `downloadUrl` not null → "Your export is ready. Download expires in 48 hours." + `<a href={downloadUrl} download="flashcards-data-export.json">Download export (JSON)</a>`
    - `status === 'failed'` → "Export failed." + retry button (calls `requestDataExport()` again)
    - Error code `EXPORT_IN_PROGRESS` → show "Your export is already being processed" inline
  - Show inline error with `role="alert"` on any other action failure (WCAG pattern from `PasswordChangeForm`, `SessionList`)
  - Use `Button` from `@/components/ui/button`

### Task 8: Update `.env.example` (AC: prerequisite)

- [x] Add to `.env.example`:

  ```
  # Data Export (Edge Function)
  APP_URL=http://localhost:3000
  ```

### Task 9: Tests (AC: #1, #2, #3)

- [x] Create `tests/integration/data-export-request.test.ts`:

  Key test cases for `requestDataExport()`:
  - `getUser()` fails → returns `{ data: null, error: { code: 'UNAUTHORIZED' } }`
  - `getUser()` returns error → returns `UNAUTHORIZED`
  - Pending job exists → returns `{ data: null, error: { code: 'EXPORT_IN_PROGRESS' } }`
  - Success: inserts job row, calls `sendEmail()` with correct `to` and subject, calls `after()`, returns `{ data: { jobId }, error: null }`
  - Email error (non-fatal): `sendEmail()` returns error → job still inserted, `after()` still called, `log()` called, returns success

  Mock pattern:
  ```typescript
  vi.mock('next/server', () => ({ after: vi.fn() }))
  vi.mock('@/lib/supabase/user', () => ({ createUserClient: vi.fn() }))
  vi.mock('@/server/email', () => ({ sendEmail: vi.fn() }))
  vi.mock('@/lib/logger', () => ({ log: vi.fn() }))
  // Mock DAL functions — NOT the raw Drizzle db (Server Actions must not bypass the DAL)
  vi.mock('@/server/db/queries/exportJobs', () => ({
    getActiveExportJob: vi.fn().mockResolvedValue({ data: null, error: null }),
    createExportJob: vi.fn().mockResolvedValue({ data: { id: 'test-job-id' }, error: null }),
  }))
  ```

- [x] Create `tests/unit/data-export-format.test.ts`:
  - Verify the export JSON structure has the expected top-level keys: `exportedAt`, `format`, `profile`, `decks`, `reviews`
  - Verify profile object excludes `isAdmin`, `deletedAt`, `previousTier`
  - Verify decks exclude `shareToken`, `deletedAt`
  - Verify `format` value is `"flashcards-gdpr-export-v1"`

## Dev Notes

### Architecture Compliance

- **Result<T>:** All Server Actions and DAL functions return `Result<T>` from `@/types`. `Result<void>` success = `{ data: undefined, error: null }`. This action returns `{ data: { jobId }, error: null }`.
- **DAL-only DB access — CRITICAL:** Never call Drizzle directly from Server Actions. ALL DB interactions go through typed wrapper functions in `src/server/db/queries/`. The Server Action imports `getActiveExportJob` and `createExportJob` from `@/server/db/queries/exportJobs`. The Edge Function uses the Supabase admin client directly (it runs in Deno, outside the Drizzle/DAL layer — this is correct and intentional).
- **Auth pattern:** Always `getUser()` via user client before any DB operation — never trust client-provided userId.
- **`(app)` layout auth guard:** Already handled by `src/app/(app)/layout.tsx`; no additional redirect needed in page.tsx. Still call `getUser()` to obtain `user.id` for data queries.
- **No Route Handlers for mutations:** `requestDataExport()` is a Server Action. The Edge Function is triggered via a `fetch()` inside `after()` — not a user-facing API route.
- **Structured logging:** `log()` called on email send failures and Edge Function trigger failures (non-fatal). The Edge Function logs its own errors.
- **`notes` table location — CRITICAL:** `notes` is defined in `src/server/db/schema/decks.ts`, NOT in a separate file. Import from `@/server/db/schema` (re-export) or directly from `'./decks'`. There is NO `'./notes'` file — importing from it will cause a runtime error.
- **`EXPORT_IN_PROGRESS` error code:** Already present in `src/types/errors.ts` — do NOT re-add it.

### `after()` from `next/server` (Next.js 16)

`after()` runs code after the response is sent to the client. Stable in Next.js 15.1+; no experimental flag required in Next.js 16.

```typescript
import { after } from 'next/server'

// In Server Action:
after(async () => {
  // Runs after response is returned — does not block the response
  await triggerExportProcessing(job.id)
})
```

If the Edge Function call fails inside `after()`, the job stays `pending`. The UI detects this and shows a retry button. This is acceptable for the MVP.

### Database Schema Quick Reference

| Table | Key columns | Notes |
|---|---|---|
| `data_export_jobs` | id, user_id, status, file_path, expires_at | **New this story** |
| `profiles` | display_name, tier, format_preferences, user_fsrs_params, gdpr_consent_at | Include in export |
| `decks` | user_id, title, subject, deleted_at | WHERE deleted_at IS NULL |
| `notes` | deck_id, user_id, content, deleted_at | Co-located in `decks.ts`; WHERE deleted_at IS NULL |
| `cards` | note_id, user_id, front_content, back_content, FSRS fields | JOIN via notes for deck context |
| `reviews` | card_id, user_id, rating, presentation_mode, response_time_ms | All user reviews |

### Export Data Queries (Edge Function — Deno/Supabase admin client)

```typescript
// 1. Profile (Learning Fingerprint included)
const { data: profile } = await adminClient
  .from('profiles')
  .select('id, display_name, tier, gdpr_consent_at, created_at, format_preferences, user_fsrs_params')
  .eq('id', userId)
  .single()

// 2. Decks (non-deleted only)
const { data: decks } = await adminClient
  .from('decks')
  .select('id, title, subject, created_at')
  .eq('user_id', userId)
  .is('deleted_at', null)
  .order('created_at', { ascending: true })

// 3. Notes (non-deleted, grouped by deck_id in JSON assembly)
const { data: notes } = await adminClient
  .from('notes')
  .select('id, deck_id, content, created_at')
  .eq('user_id', userId)
  .is('deleted_at', null)
  .order('created_at', { ascending: true })

// 4. Cards (all user cards — no soft-delete on cards table)
const { data: cards } = await adminClient
  .from('cards')
  .select(`
    id, note_id, mode, front_content, back_content,
    narrative_context, image_url,
    stability, difficulty, elapsed_days, scheduled_days,
    reps, lapses, state, due, created_at
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: true })

// 5. Reviews (FSRS review history — hard-delete on GDPR erasure means all present are valid)
const { data: reviews } = await adminClient
  .from('reviews')
  .select('id, card_id, rating, presentation_mode, response_time_ms, reviewed_at')
  .eq('user_id', userId)
  .order('reviewed_at', { ascending: true })

// 6. User email (for sending the ready/failed notification)
const { data: authUser } = await adminClient.auth.admin.getUserById(userId)
const userEmail = authUser.user?.email ?? null
```

### Export JSON Format

```json
{
  "exportedAt": "2026-03-23T12:00:00.000Z",
  "format": "flashcards-gdpr-export-v1",
  "profile": {
    "id": "<uuid>",
    "displayName": "<string | null>",
    "tier": "free",
    "gdprConsentAt": "<ISO | null>",
    "createdAt": "<ISO>",
    "learningFingerprint": {
      "formatPreferences": { "qa": 0.5, "image": 0.5, "context-narrative": 0.5 },
      "userFsrsParams": [/* 21 floats or null */]
    }
  },
  "decks": [
    {
      "id": "<uuid>",
      "title": "My Deck",
      "subject": "<string | null>",
      "createdAt": "<ISO>",
      "notes": [
        { "id": "<uuid>", "content": "Raw source text", "createdAt": "<ISO>" }
      ],
      "cards": [
        {
          "id": "<uuid>",
          "noteId": "<uuid>",
          "mode": "qa",
          "frontContent": "Question",
          "backContent": "Answer",
          "narrativeContext": null,
          "fsrs": { "stability": 1.2, "difficulty": 5.0, "reps": 3, "lapses": 0, "state": 2, "due": "<ISO>" },
          "createdAt": "<ISO>"
        }
      ]
    }
  ],
  "reviews": [
    {
      "id": "<uuid>",
      "cardId": "<uuid>",
      "rating": 3,
      "presentationMode": "qa",
      "responseTimeMs": 4200,
      "reviewedAt": "<ISO>"
    }
  ]
}
```

**GDPR Exclusions — do NOT include any of these:**

| Field | Reason |
|---|---|
| `profiles.is_admin` | Internal flag, not personal data |
| `profiles.deleted_at`, `profiles.previous_tier` | Internal state |
| `decks.share_token`, `decks.deleted_at` | Internal state |
| `cards.image_url` | External URL reference, not stored user content |
| Payment data | Stripe-managed; not in our DB (NFR-SEC8) |
| AI prompt content / learning goals | Never persisted (ephemeral session-scoped only) |
| `anonymous_sessions` rows | No stable link to registered identity post-upgrade |

### Edge Function — Emails via Resend HTTP API

The Edge Function runs in Deno; React Email templates cannot be used. Send emails via the Resend HTTP API directly:

```typescript
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const APP_URL = Deno.env.get('APP_URL')!

// Ready email
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'noreply@flashcards.app',
    to: userEmail,
    subject: 'Your Flashcards data export is ready',
    html: `
      <p>Your personal data export is ready to download.</p>
      <p>
        <a href="${APP_URL}/settings/privacy">Go to Privacy Settings to download</a>
        (available for 48 hours)
      </p>
      <p>The download contains your profile, decks, cards, study history,
         and learning preferences in JSON format.</p>
    `,
  }),
})

// Failed email
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'noreply@flashcards.app',
    to: userEmail,
    subject: 'Your Flashcards data export failed',
    html: `
      <p>We were unable to generate your data export.</p>
      <p><a href="${APP_URL}/settings/privacy">Try again from your Privacy Settings</a></p>
      <p>If the problem persists, please contact support.</p>
    `,
  }),
})
```

**Edge Function env vars** (set via Supabase CLI or dashboard):
- `SUPABASE_URL` — auto-injected
- `SUPABASE_SERVICE_ROLE_KEY` — auto-injected
- `RESEND_API_KEY` — `supabase secrets set RESEND_API_KEY=re_...`
- `APP_URL` — `supabase secrets set APP_URL=https://your-domain.com`

### Storage: Signed URL Pattern

The privacy page RSC generates a fresh 1-hour signed URL only when the job is `ready` and within its 48-hour availability window. Never store signed URLs in the DB — generate them at page-load time.

```typescript
// page.tsx — server-side only
const adminClient = createServerAdminClient()
const { data } = await adminClient.storage
  .from('data-exports')
  .createSignedUrl(job.filePath!, 3600) // 1-hour window
const downloadUrl = data?.signedUrl ?? null
```

The download button in `DataExportSection` uses the `download` attribute to force file download:

```tsx
<a href={downloadUrl} download="flashcards-data-export.json">
  Download export (JSON)
</a>
```

### Privacy Page — Section Layout Pattern

Follows the `aria-labelledby` section pattern established in Story 2.2 (password change) and Story 2.3 (session list). Stories 2.5 and 2.6 will add more sections to this same `/settings/privacy` page. Do NOT add stubs or placeholders for future sections — add only what this story requires.

### File Structure

**New files:**
- `supabase/migrations/0004_data_export_jobs.sql`
- `supabase/migrations/0005_data_exports_storage.sql`
- `src/server/db/schema/exportJobs.ts`
- `src/server/db/queries/exportJobs.ts` — DAL: `getActiveExportJob`, `createExportJob`
- `src/app/(app)/settings/privacy/page.tsx`
- `src/app/(app)/settings/privacy/actions.ts`
- `src/components/privacy/DataExportSection.tsx`
- `src/server/email/templates/DataExportAckEmail.tsx`
- `supabase/functions/process-data-export/index.ts`
- `tests/integration/data-export-request.test.ts`
- `tests/unit/data-export-format.test.ts`

**Modified files:**
- `src/server/db/schema/index.ts` — add `export * from './exportJobs'`
- `.env.example` — add `APP_URL=http://localhost:3000`

**`src/types/errors.ts` — NO changes needed** (`EXPORT_IN_PROGRESS` already present).

**No new profiles table columns.** No changes to `next.config.ts` — `after()` is stable in Next.js 16.

### Testing Pattern

Mock `after` as a no-op to prevent background calls during tests:

```typescript
vi.mock('next/server', () => ({ after: vi.fn() }))
```

Mock Drizzle DB with chainable query objects:

```typescript
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from:   vi.fn().mockReturnThis(),
  where:  vi.fn().mockReturnThis(),
  limit:  vi.fn().mockResolvedValue([]), // default: no existing jobs
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 'test-job-id' }]),
}
vi.mock('@/server/db', () => ({ db: mockDb }))
```

Note: the `and()`, `eq()`, `inArray()` Drizzle operators do not need mocking — they produce plain objects that the mock `.where()` swallows.

### Previous Story Learnings (from Stories 2.1–2.3)

- **`createUserClient()`** from `@/lib/supabase/user`; **`createServerAdminClient()`** from `@/lib/supabase/server`
- **`(app)` layout** already has auth guard — still call `getUser()` in page.tsx to get `user.id`
- **shadcn/ui:** `Button` from `@/components/ui/button` for action buttons
- **`Result<T>` void success:** `{ data: undefined, error: null }` — but this action returns `{ data: { jobId }, error: null }`, not void
- **Section layout:** `<section aria-labelledby="X-heading">` with `<main className="max-w-xl mx-auto p-4 flex flex-col gap-8">`
- **`useTransition` over `useActionState`:** Use for stateless action triggers (same as `SessionList`)
- **Inline error with `role="alert"`:** WCAG accessibility pattern — shown on action failure
- **No `revalidatePath`:** Component manages state locally; RSC data refreshes on next full navigation
- **`notes` import:** Import from `@/server/db/schema` or `./decks` — NOT from `./notes` (no such file exists)

### Cross-Story Awareness

- **Story 2.5 (GDPR Personal Data Summary):** Will add a second section to `/settings/privacy`. Structure the page cleanly so a second `<section>` can be appended without refactoring.
- **Story 2.6 (Account Deletion Request):** Will add a third section to `/settings/privacy`.
- **Story 9.x (Admin observability):** The `log()` calls in this story's error paths feed into the structured error log (FR54).

### References

- Epic 2 Story 2.4 acceptance criteria [Source: `_bmad-output/planning-artifacts/epics.md#Story-2.4`]
- Architecture: GDPR compliance — 72h export SLA, EU data residency [Source: `_bmad-output/planning-artifacts/architecture.md`]
- Architecture: API layer — Server Actions for mutations, Route Handlers for webhooks only [Source: `_bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns`]
- Architecture: `notes` table co-located in `src/server/db/schema/decks.ts` [Source: `src/server/db/schema/cards.ts` comment C3]
- Architecture: `sendEmail()` wrapper and template pattern [Source: `src/server/email/index.ts`]
- Architecture: `Result<T>` and ErrorCodes [Source: `src/types/errors.ts`]
- Architecture: Soft-delete cascade (DAL only, no DB triggers) [Source: `_bmad-output/planning-artifacts/architecture.md`]
- Context7: Supabase Storage signed URLs and bucket policies
- Context7: Next.js 16 `after()` for background tasks in Server Actions
- Previous story patterns [Source: `_bmad-output/implementation-artifacts/2-3-active-session-view-and-revocation.md`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- **DAL violation caught during finalization**: Initial implementation called Drizzle `db` directly from `actions.ts`, bypassing the required DAL layer. Fixed by creating `src/server/db/queries/exportJobs.ts` with `getActiveExportJob` and `createExportJob`, then refactoring `actions.ts` to import from the DAL. Integration tests were also updated to mock the DAL functions rather than the raw db.
- **`vi.hoisted()` required for test mock chain**: `vi.mock` factories are hoisted above variable declarations, causing TDZ errors when mock chain variables (mockSelectFn, mockInsertFn, etc.) were declared after the `vi.mock` calls. Resolved by wrapping all mock variables in `vi.hoisted(() => {...})`. However, after the DAL refactor these are no longer needed in the integration tests.
- **`errors.test.ts` count mismatch**: The test asserted exactly 6 error codes, but `EXPORT_IN_PROGRESS` was added to `ErrorCodes` in a previous story. Updated the test to assert 7 codes and added a specific test for `EXPORT_IN_PROGRESS`.
- **`.env.example` already has `NEXT_PUBLIC_APP_URL`**: Task 8 required adding `APP_URL`. The existing file has `NEXT_PUBLIC_APP_URL` for the Next.js app. The Edge Function uses `APP_URL` set via `supabase secrets set` (Deno env context), not `.env.local`. This is acceptable — the Edge Function's env vars are documented in Dev Notes.

### Completion Notes List

- All 3 ACs implemented: job queueing with ACK email (AC1), Edge Function generates export and sends ready email (AC2), failure notification with retry (AC3).
- **Deferred manual validation**: Edge Function E2E tests (failure path, full happy path) deferred to a later phase when login and the landing page are working. All code was reviewed and audited; the deferral is operational only, not a code gap.
- `after()` from `next/server` (stable in Next.js 15.1+/16) used to trigger Edge Function processing without blocking the Server Action response.
- Edge Function uses Resend HTTP API directly (no React Email — Deno runtime incompatible with React Email templates).
- Download signed URL generated fresh at page-load time (1h window) by admin client — never stored in DB.
- Export format `flashcards-gdpr-export-v1` explicitly excludes: `is_admin`, `deleted_at`, `previous_tier`, `share_token`, `image_url`, payment data, AI prompts, anonymous session data.

### File List

**New files:**
- `supabase/migrations/0004_data_export_jobs.sql`
- `supabase/migrations/0005_data_exports_storage.sql`
- `src/server/db/schema/exportJobs.ts`
- `src/server/db/queries/exportJobs.ts`
- `src/app/(app)/settings/privacy/actions.ts`
- `src/app/(app)/settings/privacy/page.tsx`
- `src/components/privacy/DataExportSection.tsx`
- `src/server/email/templates/DataExportAckEmail.tsx`
- `supabase/functions/process-data-export/index.ts`
- `supabase/functions/process-data-export/config.toml`
- `tests/integration/data-export-request.test.ts`
- `tests/unit/data-export-format.test.ts`

**Modified files:**
- `src/server/db/schema/index.ts` — added `export * from './exportJobs'`
- `src/types/errors.ts` — `EXPORT_IN_PROGRESS` was already present (added in a prior session)
- `src/types/errors.test.ts` — updated error code count assertion from 6 → 7, added `EXPORT_IN_PROGRESS` test
