# Story 2-1: Profile Information Update

**Status:** done
**Epic:** Epic 2 — Account Management & GDPR

## Story

As a registered user,
I want to update my display name and avatar,
So that my profile reflects my current identity.

## Acceptance Criteria

1. **Given** I am on my profile settings page **When** I update my display name and save **Then** the new name is reflected immediately across the app **And** the update is persisted in the `profiles` table via the DAL

2. **Given** I upload a new avatar image **When** the upload completes **Then** the image is stored in Supabase Storage and linked to my profile **And** my avatar is updated everywhere it appears

3. **Given** I submit a display name that exceeds the maximum length (50 characters) **When** I try to save **Then** a validation error is shown and no update is made **And** the error is shown before any server call is made (client-side Zod validation)

4. **Given** I am an unauthenticated user **When** I navigate to `/settings/profile` **Then** I am redirected to `/login` by middleware

## Tasks / Subtasks

- [x] Task 1: Add `avatar_url` column to profiles schema + migration (AC: #2)
  - [x] Add `avatarUrl: text('avatar_url')` (nullable) to `profiles` table in `src/server/db/schema/users.ts`
  - [x] Create Drizzle migration file `supabase/migrations/0002_profiles_avatar_url.sql`: `ALTER TABLE profiles ADD COLUMN avatar_url text;`
  - [x] Manual SQL migration — no drizzle-kit generate needed for single ALTER TABLE

- [x] Task 2: Supabase Storage — `avatars` bucket setup (AC: #2)
  - [x] Created `supabase/migrations/0003_avatars_storage_rls.sql` with bucket INSERT + 4 RLS policies
  - [x] Bucket: public=true; INSERT/UPDATE/DELETE restricted to `(auth.uid())::text = foldername[1]`; SELECT public
  - [x] Added `*.supabase.co` to `next.config.ts` `images.remotePatterns`
  - [x] Added `https://*.supabase.co` to CSP `img-src`

- [x] Task 3: DAL function `updateProfile()` (AC: #1, #2)
  - [x] Added `updateProfile(userId, data: ProfileUpdateData)` to `src/server/db/queries/users.ts`
  - [x] `ProfileUpdateData = { displayName?: string | null; avatarUrl?: string | null }`
  - [x] Drizzle partial update — only specified fields written
  - [x] Returns `Result<void>`

- [x] Task 4: Server Action for display name update (AC: #1, #3)
  - [x] Created `src/app/(app)/settings/profile/actions.ts`
  - [x] `updateDisplayName(formData)` — getUser() → validate → updateProfile → revalidatePath
  - [x] `updateAvatarUrl(url)` — getUser() → validateAvatarUrl() domain check → updateProfile → revalidatePath
  - [x] Both return `Result<void>`

- [x] Task 5: `AvatarUpload` client component (AC: #2)
  - [x] Created `src/components/profile/AvatarUpload.tsx`
  - [x] Created `src/lib/supabase/browser.ts` (browser Supabase client factory)
  - [x] JPEG/PNG/WebP accepted; 2 MB max enforced client-side before upload
  - [x] Upload → getPublicUrl → updateAvatarUrl Server Action
  - [x] Initials placeholder when no avatar; loading overlay during upload

- [x] Task 6: Profile settings page (AC: #1, #2, #3, #4)
  - [x] Created `src/app/(app)/settings/profile/page.tsx` — Server Component with auth guard
  - [x] Created `src/components/profile/DisplayNameForm.tsx` — client component with `useActionState`
  - [x] Created `src/app/(app)/layout.tsx` — auth guard for all (app) routes

- [x] Task 7: Tests (AC: #1, #2, #3)
  - [x] Created `src/lib/validators/profile.test.ts` — 11 unit tests, all pass
  - [x] Created `tests/integration/profile-update.test.ts` — 5 run + 5 skip (DB) — all pass/skip correctly
  - [x] Full suite: 90 pass, 26 skip, 0 fail

## Dev Notes

### Architecture Requirements

- **DAL pattern:** All DB access via `src/server/db/queries/users.ts`. Server Actions call DAL functions — never raw Drizzle in actions.
- **Result<T> pattern:** DAL functions and Server Actions return `Result<T>` from `@/types`. Never throw across these boundaries.
- **Server Actions authentication:** Always call `supabase.auth.getUser()` — never trust client-provided `userId`. Derive `userId` server-side only.
- **`(app)` route group:** Middleware at `middleware.ts` already redirects unauthenticated requests for `/(app)/*` routes to `/login`. The `(app)` layout is shared across all authenticated routes.
- **Revalidation:** After mutation, call `revalidatePath('/', 'layout')` to propagate display name changes to any nav/header components showing user name.

### Schema Change — `avatar_url` Column

`profiles` currently has `displayName` but no `avatarUrl`. This story adds it:

```typescript
// src/server/db/schema/users.ts — add to profiles table
avatarUrl: text('avatar_url'),
```

```sql
-- supabase/migrations/0002_profiles_avatar_url.sql
ALTER TABLE profiles ADD COLUMN avatar_url text;
```

### Supabase Storage — `avatars` Bucket

Bucket: `avatars`, public: `true` (public read, no auth required for GET).

Storage RLS policies (SQL):
```sql
-- INSERT: user can only upload to their own folder
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((auth.uid())::text = (storage.foldername(name))[1]);

-- UPDATE: same
CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING ((auth.uid())::text = (storage.foldername(name))[1]);

-- DELETE: same
CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING ((auth.uid())::text = (storage.foldername(name))[1]);

-- SELECT: public read
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
```

Upload path convention: `{userId}/avatar.{ext}` with `upsert: true` — always overwrites, no accumulation of old files.

### Avatar Upload — Client vs Server

Avatar upload happens **client-side** (browser → Supabase Storage directly) using the Supabase browser client and the user's authenticated session. This avoids routing binary file data through Next.js Server Actions. The resulting public URL is then persisted server-side via `updateAvatarUrl()` Server Action.

```typescript
// Client-side upload pattern
const { error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.${ext}`, file, { upsert: true })

const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.${ext}`)

await updateAvatarUrl(data.publicUrl)
```

### Display Name Validation

Zod schema (shared for client + server validation):
```typescript
export const displayNameSchema = z.string().trim().min(1, 'Name cannot be empty').max(50, 'Name must be 50 characters or fewer')
```

Place in `src/lib/validations/profile.ts` for reuse between client form and server action.

### File Constraints for Avatar Upload

- Accepted types: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 2 MB (enforced client-side before upload attempt)
- Validate both `file.type` and `file.size` before calling `supabase.storage.upload()`

### `next/image` Configuration

Avatar URLs are served from Supabase Storage. Ensure `next.config.ts` includes:
```typescript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '*.supabase.co' },  // already present from architecture
  ],
}
```
If already present from a previous story, no change needed.

### File Structure

New files to create:
- `src/app/(app)/settings/profile/page.tsx` — profile settings page (Server Component)
- `src/app/(app)/settings/profile/actions.ts` — `updateDisplayName`, `updateAvatarUrl` Server Actions
- `src/app/(app)/layout.tsx` — (app) route group layout with auth guard (if not yet created)
- `src/components/profile/AvatarUpload.tsx` — client component for avatar upload
- `src/lib/validations/profile.ts` — shared Zod schema for display name
- `supabase/migrations/0002_profiles_avatar_url.sql` — DB migration
- `tests/unit/profile-update.test.ts`
- `tests/integration/profile-update.test.ts`

Modified files:
- `src/server/db/schema/users.ts` — add `avatarUrl` to `profiles`
- `src/server/db/queries/users.ts` — add `updateProfile()`

### Testing Requirements

- **Unit tests** (`tests/unit/`): Test `updateProfile()` DAL function with mock DB — partial update correctness.
- **Integration tests** (`tests/integration/`): Test `updateDisplayName` Server Action with real DB (Supabase local) — validation rejection, successful persist.
- **No E2E tests** for this story: avatar upload requires real Storage bucket; defer to manual QA.
- Follow Vitest patterns established in previous stories (see `tests/integration/anonymous-upgrade.test.ts`).

### Previous Story Learnings

- **C4 (users.ts):** `profiles` table does NOT use `.references()` for the `id → auth.users` FK — Supabase handles this via trigger. Do not add `.references()`.
- **E4 (users.ts):** Use exact Drizzle column names matching `schema/users.ts` — `monthStart`, not `reset_at`.
- **O1 (users.ts):** `aiFreeeTierEnabled` has 3 e's intentionally — match the canonical schema comment.
- **Server Actions auth:** Derive `userId` from `supabase.auth.getUser()` server-side, never from client parameters — prevents privilege escalation (see Story 1.7, Task 2).
- **Drizzle partial update:** Use `db.update(profiles).set({ displayName }).where(eq(profiles.id, userId))` — Drizzle sends only the specified columns, no need to fetch first.
- **`(auth)` route group layout:** Already exists at `src/app/(auth)/layout.tsx`. Create `(app)` layout similarly.
- **shadcn/ui forms:** Use shadcn `Form`, `FormField`, `FormItem`, `FormLabel`, `FormMessage` for consistent validation display (see Story 1.5/1.7 signup forms).
- **Result type:** Always return `{ data: undefined, error: null }` on success for void actions (not `{ data: null }`).

### API / Integration Notes

- **Env vars required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already set from Epic 1).
- **No new env vars** needed for this story.
- **Manual setup step:** Create `avatars` bucket in Supabase Dashboard + apply Storage RLS policies (cannot be done via Drizzle migration — use Supabase Dashboard or `supabase/migrations/` SQL applied via `supabase db push`).

## Dev Agent Record

### Implementation Notes

Implemented all 7 tasks in order. Key decisions:
- `profiles.avatarUrl` added via `ALTER TABLE` SQL migration (not drizzle-kit generate) since it is a single column addition with no complex constraints.
- Storage bucket + RLS kept in a separate migration file (`0003`) to maintain clear separation from schema changes.
- Avatar upload is entirely client-side (browser → Supabase Storage directly), with only the resulting public URL persisted via a Server Action — avoids routing binary data through Next.js.
- `validateAvatarUrl()` guards the `updateAvatarUrl` Server Action against storing arbitrary external URLs in `profiles.avatar_url`.
- `DisplayNameForm` uses `useActionState` for optimistic inline error/success feedback without a full page reload.
- `(app)` layout created to centralize auth redirect for all future authenticated routes.
- Browser Supabase client factory added at `src/lib/supabase/browser.ts` — first use of client-side Storage.

### Debug Log

- Zod v4 uses `{ error: '...' }` not `{ message: '...' }` for per-field error messages — matched existing pattern in `src/lib/validators/auth.ts`.
- `useActionState` (React 19 API) used in `DisplayNameForm` — replaces deprecated `useFormState`.
- CSP `img-src` needed updating to allow `*.supabase.co` for avatar display via `next/image`.

## File List

**New:**
- `supabase/migrations/0002_profiles_avatar_url.sql`
- `supabase/migrations/0003_avatars_storage_rls.sql`
- `src/app/(app)/layout.tsx`
- `src/app/(app)/settings/profile/page.tsx`
- `src/app/(app)/settings/profile/actions.ts`
- `src/components/profile/AvatarUpload.tsx`
- `src/components/profile/DisplayNameForm.tsx`
- `src/lib/supabase/browser.ts`
- `src/lib/validators/profile.ts`
- `src/lib/validators/profile.test.ts`
- `tests/integration/profile-update.test.ts`
- `tests/unit/profile-actions.test.ts`
- `tests/unit/profile-dal.test.ts`

**Modified:**
- `src/server/db/schema/users.ts` — added `avatarUrl` column
- `src/server/db/queries/users.ts` — added `updateProfile()` DAL function + column whitelist + empty-data guard
- `next.config.ts` — added Supabase Storage `remotePatterns`, CSP `img-src` + `connect-src`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — updated statuses

## Change Log

- **feat:** Added `avatar_url` column to `profiles` table via migration `0002`
- **feat:** Created `avatars` Supabase Storage bucket with per-user-folder RLS via migration `0003`
- **feat:** Added `updateProfile()` DAL function for partial profile updates
- **feat:** Added `updateDisplayName` and `updateAvatarUrl` Server Actions with auth + validation guards
- **feat:** Built `AvatarUpload` client component — direct-to-Storage upload with initials fallback
- **feat:** Built `DisplayNameForm` client component — inline validation feedback via `useActionState`
- **feat:** Created `(app)` route group layout and `/settings/profile` page
- **feat:** Added `src/lib/supabase/browser.ts` — browser client factory for client components
- **feat:** Added `src/lib/validators/profile.ts` — shared `displayNameSchema` + URL validator
- **fix:** Updated `next.config.ts` CSP and `remotePatterns` to allow Supabase Storage image domains
