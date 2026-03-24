# Story 3-7: Marketing Landing Page

**Status:** ready-for-dev
**Epic:** Epic 3 — Deck & Card Library

## Story

As a potential user visiting the app for the first time,
I want to see a clear, professional landing page that explains the product and guides me to get started,
So that I understand what Flashcards offers and can immediately sign up, log in, or try the demo deck.

## Acceptance Criteria

1. **Given** I am an unauthenticated visitor and I navigate to `/` **When** the page loads **Then** I see the marketing landing page with a nav bar (logo, Login link, Sign Up button), a hero section with a headline, subheadline, and two CTAs, and a brief value proposition section

2. **Given** I am an authenticated user and I navigate to `/` **When** the middleware runs **Then** I am redirected to `/decks` without seeing the landing page

3. **Given** I am on the landing page and I click "Get started free" **When** the link is followed **Then** I am taken to `/register`

4. **Given** I am on the landing page and I click "Try a demo deck" **When** the link is followed **Then** I am taken to `/cold-start`

5. **Given** I am on the landing page and I click "Log in" in the nav **When** the link is followed **Then** I am taken to `/login`

6. **Given** a web crawler or social platform fetches `/` **Then** the page has a proper `<title>`, meta description, and OpenGraph tags that accurately describe the product

## Tasks / Subtasks

- [ ] Task 1: Middleware — redirect authenticated users away from `/` (AC: #2)
  - [ ] In `src/middleware.ts`, after the existing unauthenticated-user redirect block, add: if user is authenticated AND `pathname === '/'` → redirect to `/decks`
  - [ ] Keep the existing unauthenticated-user guard intact — do not restructure it

- [ ] Task 2: `MarketingNav` component (AC: #1, #3, #5)
  - [ ] Create `src/components/shared/MarketingNav.tsx` — Server Component (no `'use client'`)
  - [ ] Left: product logo/name as a `<Link href="/">` — text "Flashcards", same `font-semibold` as `AppNav`
  - [ ] Right: `<Link href="/login">Log in</Link>` and `<Link href="/register">Get started</Link>` styled as secondary + primary buttons respectively
  - [ ] Same `border-b bg-background px-4 py-3 flex items-center justify-between` structure as `AppNav`

- [ ] Task 3: `(marketing)` layout (AC: #1)
  - [ ] Create `src/app/(marketing)/layout.tsx`
  - [ ] Renders `<MarketingNav />` above `{children}`, plus a minimal footer
  - [ ] Footer: `<footer>` with links to `/privacy` and `/terms` — small muted text, centered
  - [ ] No auth check in layout — this is a fully public route group

- [ ] Task 4: Landing page (AC: #1, #3, #4, #6)
  - [ ] Create `src/app/(marketing)/page.tsx` — Server Component (RSC, no `'use client'`)
  - [ ] Export `metadata` with `title`, `description`, and `openGraph` fields (see Dev Notes)
  - [ ] Hero section: large headline, subheadline, two CTA buttons ("Get started free" → `/register`, "Try a demo deck" → `/cold-start`)
  - [ ] Value proposition: 3 concise feature highlights (see Dev Notes for suggested copy)
  - [ ] Keep it static — no DB calls, no Supabase, no auth

- [ ] Task 5: Remove scaffold root page (AC: #1)
  - [ ] Delete `src/app/page.tsx` — this is the default Next.js scaffold; `(marketing)/page.tsx` takes over `/`
  - [ ] **Critical**: in Next.js App Router, `app/page.tsx` and `app/(marketing)/page.tsx` would conflict at the same `/` route. The scaffold MUST be deleted.

- [ ] Task 6: Update root layout metadata (AC: #6)
  - [ ] In `src/app/layout.tsx`, update the `metadata` export: change `title` from `"Create Next App"` to `"Flashcards"` and `description` from the scaffold text to a proper product description
  - [ ] The landing page's own `metadata` export will override the root for `/` specifically (Next.js metadata merging)

- [ ] Task 7: E2E tests (AC: #1, #2, #3, #4, #5)
  - [ ] Create `tests/e2e/landing-page.spec.ts`
  - [ ] Test: unauthenticated visit to `/` → page contains nav, hero headline, CTA buttons
  - [ ] Test: unauthenticated visit to `/` → "Get started free" link points to `/register`
  - [ ] Test: unauthenticated visit to `/` → "Try a demo deck" link points to `/cold-start`
  - [ ] Test: unauthenticated visit to `/` → "Log in" nav link points to `/login`
  - [ ] Auth guard test: authenticated session visit to `/` → redirected to `/decks`
  - [ ] Follow the pattern in `tests/e2e/settings-privacy.spec.ts` for the auth guard test

- [ ] Task 8: Fix missing `cold_start_viewed` analytics event (AC: FR58)
  - [ ] In `src/app/cold-start/page.tsx`, add `trackEvent('cold_start_viewed', {})` after the `deckResult` check passes (inside `ColdStartPage`, after `if (deckResult.error)` guard)
  - [ ] Import `trackEvent` from `'@/lib/analytics'`
  - [ ] Fire-and-forget: call as `trackEvent(...)` without `await` or `void` — same fire-and-forget pattern as `deck_created` in decks `actions.ts`
  - [ ] This closes a gap from Story 1-4: the `AppEvent` type was defined but never called per FR58 + Definition of Done

## Dev Notes

### Architecture Requirements

- **Route group ownership of `/`**: In Next.js App Router, a `page.tsx` directly under `app/` AND a `page.tsx` under `app/(marketing)/` cannot both serve `/`. They conflict. **`app/page.tsx` must be deleted** before `app/(marketing)/page.tsx` is created — or the build will fail with a route conflict error.
- **`(marketing)/` layout does NOT affect the URL**: Route groups in Next.js use `()` syntax precisely to avoid URL impact. `app/(marketing)/page.tsx` serves `/`, `app/(marketing)/pricing/page.tsx` serves `/pricing`, etc.
- **MarketingNav is a Server Component**: Unlike `AppNav`, there is no logout action or client state needed — just navigation links. Do NOT add `'use client'`. Server Components render faster and don't require hydration.
- **No auth in `(marketing)/` layout**: The middleware handles authenticated-user redirect at the edge before the RSC tree renders. The layout should not call `createUserClient()` or `supabase.auth.getUser()`.
- **Cold-start route**: The demo link points to `/cold-start` — this route already exists at `src/app/cold-start/page.tsx` (implemented in Story 1-4). No changes needed there.

### Middleware Change

Add after the existing `isProtectedRoute` block in `src/middleware.ts`:

```typescript
// Redirect authenticated users away from the marketing landing page
if (user && pathname === '/') {
  return NextResponse.redirect(new URL('/decks', request.url))
}
```

Do NOT restructure the existing middleware. Insert this block as-is after line ~63.

### Metadata (SEO)

```typescript
// src/app/(marketing)/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Flashcards — Smarter studying with spaced repetition',
  description:
    'Build your own flashcard decks, study with science-backed spaced repetition, and let AI generate cards from any topic. Free to start.',
  openGraph: {
    title: 'Flashcards — Smarter studying with spaced repetition',
    description:
      'Build your own flashcard decks, study with science-backed spaced repetition, and let AI generate cards from any topic.',
    type: 'website',
  },
}
```

**Next.js metadata merging**: The root `app/layout.tsx` defines base metadata. Each page can export its own `metadata` object which is shallowly merged — page-level fields take precedence. The landing page should export its own `metadata` for accurate `/` OG data.

### Suggested Landing Page Copy

**Hero headline:** `"Study smarter. Remember longer."`
**Hero subheadline:** `"Build your own flashcard decks and let spaced repetition do the rest — backed by science, powered by AI."`

**Value props (3 items):**
1. **Your decks, your way** — Create decks from any topic, add cards manually or with AI, study at your own pace.
2. **Science-backed scheduling** — FSRS-6 spaced repetition shows you each card at exactly the right moment.
3. **AI that builds for you** — Paste text or describe a topic, and AI generates a complete deck in seconds.

These are suggestions. The developer can adjust wording but should preserve the product-accurate claims (FSRS-6, AI generation).

### Key Files

#### New Files
| Path | Purpose |
|------|---------|
| `src/components/shared/MarketingNav.tsx` | Server Component nav for public pages |
| `src/app/(marketing)/layout.tsx` | Layout wrapping all marketing pages |
| `src/app/(marketing)/page.tsx` | Landing page at `/` |
| `tests/e2e/landing-page.spec.ts` | E2E tests for landing page and auth redirect |

#### Modified Files
| Path | Change |
|------|--------|
| `src/middleware.ts` | Add authenticated-user redirect from `/` to `/decks` |
| `src/app/layout.tsx` | Update `metadata` title + description from scaffold defaults |

#### Deleted Files
| Path | Reason |
|------|--------|
| `src/app/page.tsx` | Next.js scaffold — conflicts with `(marketing)/page.tsx` at same `/` route |

### `(marketing)/` Layout Structure

```typescript
// src/app/(marketing)/layout.tsx
import MarketingNav from '@/components/shared/MarketingNav'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <nav className="flex justify-center gap-6">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
      </footer>
    </div>
  )
}
```

Note: `<main>` wraps `{children}` here — individual pages must NOT also wrap their content in `<main>` (WCAG duplicate landmark violation, pattern established in Story 2-6).

### `MarketingNav` Pattern

```typescript
// src/components/shared/MarketingNav.tsx
// Server Component — no 'use client'
import Link from 'next/link'

export default function MarketingNav() {
  return (
    <nav className="border-b bg-background px-4 py-3 flex items-center justify-between">
      <Link href="/" className="font-semibold text-foreground hover:opacity-80">
        Flashcards
      </Link>
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Get started
        </Link>
      </div>
    </nav>
  )
}
```

### E2E Test Pattern

Follow `tests/e2e/settings-privacy.spec.ts` for the auth guard test. For unauthenticated page content tests, follow the public page test in that same file (the `/account-deleted` tests that use `page.goto()` without any auth setup).

```typescript
// Auth guard test shape (authenticated user → redirect)
test('redirects authenticated user from / to /decks', async ({ page }) => {
  await page.goto('/') // middleware will redirect
  await expect(page).toHaveURL('/decks')
})
```

The auth state setup (signing in before the test) follows the same `storageState` / `test.use({ storageState: ... })` pattern used in other E2E specs. Check existing specs for the exact helper.

### What This Story Does NOT Include

- **Pricing page** (`(marketing)/pricing/page.tsx`) — separate future story
- **Privacy policy / Terms pages** (`(marketing)/privacy/`, `(marketing)/terms/`) — separate stories, legal content TBD
- **Sitemap** (`sitemap.ts`) — added once more marketing pages exist
- **`/register` page** — already exists (Story 1-5)
- **`landing_page_viewed` analytics event** — deferred to Epic 9 (Story 9-7). At that point: add `'landing_page_viewed'` to `AppEvent` union in `src/lib/analytics.ts`, call `trackEvent('landing_page_viewed', {})` in `(marketing)/page.tsx`, and update the funnel definition to: Landing Page Viewed → Cold Start Viewed → Signup → First Deck Created → First Study Session → Upgrade. Also update FR58 in the PRD at that time.

### WCAG Notes

- The `(marketing)/layout.tsx` wraps `{children}` in `<main>`. Individual landing page sections use `<section>` elements — never a nested `<main>` (duplicate landmark violation, same pattern enforced in Story 2-6 / `account-deleted`).
- All `<Link>` / `<a>` elements must have meaningful text (no "click here").
- CTA buttons that look like buttons (`<Link>` with button styling) are `<a>` elements under the hood — accessible by default.

### Existing Conventions to Follow

- Tailwind utility classes only — no custom CSS
- `font-semibold`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground` match existing component vocabulary (`AppNav`, `CreateDeckForm`)
- `rounded-md` for buttons (not `rounded-full` — `AppNav` uses `rounded-md`)
- Server Components unless client state is explicitly needed
- `export default` for page/layout components, named export for shared components (`export default function MarketingNav`)
