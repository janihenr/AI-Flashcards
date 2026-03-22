# Story 1.3: Cookie Consent Banner & GDPR Consent Storage

Status: done

## Story

As a new visitor to the Flashcards app,
I want to see a cookie consent banner where I can accept, decline, or customize my preferences,
So that my privacy choices are respected and only consented cookies/analytics are activated.

## Acceptance Criteria

1. **Given** I am a new visitor who has not previously set a consent preference **When** I land on any page **Then** a cookie consent banner is displayed and blocks analytics loading **And** the banner offers three actions: Accept All, Decline All, Customize

2. **Given** I click "Accept All" **When** my preference is stored **Then** analytics cookies are activated and the banner is dismissed **And** my preference is persisted in the Zustand cookie consent store (localStorage-backed)

3. **Given** I click "Decline All" **When** my preference is stored **Then** only strictly functional cookies are set and all analytics remain blocked

4. **Given** I have previously set a preference **When** I return to the site **Then** the banner is not shown and my stored preference is applied on load **And** the preference persists for 12 months (stored in localStorage with an expiry timestamp); after 12 months the banner re-appears

5. **Given** the banner is visible **When** I interact with it using only the keyboard **Then** I can tab to each action and activate it — meeting WCAG 2.1 AA keyboard accessibility (FR53) **And** the banner has minimum 4.5:1 color contrast for all text (NFR-ACC4)

## Tasks / Subtasks

- [x] Task 1: Install Zustand (AC: all)
  - [x] `pnpm add zustand`
  - [x] Verify installed as a regular dependency (not devDependency)

- [x] Task 2: Create cookie consent Zustand store (AC: #2, #3, #4)
  - [x] Create `src/stores/cookie-consent.ts` using Zustand `persist` middleware (see canonical pattern in Dev Notes)
  - [x] Store tracks: `analytics: boolean`, `consentGiven: boolean`, `expiresAt: number | null`
  - [x] Implement `acceptAll()`, `declineAll()`, `setAnalytics(value: boolean)`, `resetConsent()` actions
  - [x] Implement `hasValidConsent()` — returns `false` if `!consentGiven || !expiresAt || Date.now() > expiresAt`
  - [x] On expiry check in `hasValidConsent()`: call `resetConsent()` and return `false` (banner re-appears silently)
  - [x] Persist to localStorage key `'cookie-consent'` using `createJSONStorage(() => localStorage)`
  - [x] Use `partialize` to exclude function references from persistence (only persist `analytics`, `consentGiven`, `expiresAt`)
  - [x] Set expiry: `expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000` on accept/decline

- [x] Task 3: Create useCookieConsent hook (AC: #4)
  - [x] Create `src/hooks/useCookieConsent.ts` (see canonical pattern in Dev Notes)
  - [x] Add hydration safety: `isLoaded` state starts `false`, set to `true` in `useEffect`
  - [x] Return: `{ consent, hasValidConsent, acceptAll, declineAll, setAnalytics, isLoaded }`
  - [x] `isLoaded` MUST be `false` until client hydration — prevents banner flash on returning visitors

- [x] Task 4: Create CookieConsentBanner component (AC: #1, #2, #3, #5)
  - [x] Create `src/components/shared/CookieConsentBanner.tsx` (see canonical pattern in Dev Notes)
  - [x] Add `'use client'` directive at top of file
  - [x] Render `null` until `isLoaded && !hasValidConsent()` — never render on SSR
  - [x] Default view: three buttons — "Accept All", "Decline All", "Customize"
  - [x] Customize panel: initialize `analyticsChecked` local state from `consent.analytics` (not hardcoded `false`) — prevents silently revoking consent when user opens Customize after already accepting
  - [x] Customize view: checkbox for analytics consent + "Save Preferences" + "Back" buttons
  - [x] Functional cookies checkbox always checked + disabled (required, cannot be declined)
  - [x] All buttons: visible focus rings, keyboard-activatable (`focus:ring-2 focus:ring-offset-2`)
  - [x] Focus trap: use `bannerRef` + `onKeyDown` handler — see canonical focus trap pattern in Dev Notes (WCAG 2.1 AA SC 2.1.2)
  - [x] Auto-focus first button on mount and on Customize view toggle — see `useEffect` pattern in Dev Notes
  - [x] Root element: `role="dialog"` + `aria-label="Cookie consent"` — NO `aria-live` on dialog root (causes double screen-reader announcement)
  - [x] Color contrast: use `text-gray-900` on white background (17.7:1 — exceeds 4.5:1 NFR-ACC4)
  - [x] Fixed at bottom of viewport: `fixed bottom-0 left-0 right-0 z-50`
  - [x] **DO NOT use shadcn/ui** — plain Tailwind CSS only (shadcn is initialized in Story 1.4)

- [x] Task 5: Update root layout (AC: #1)
  - [x] Open `src/app/layout.tsx`
  - [x] Import and render `<CookieConsentBanner />` inside `<body>` (after `{children}`)
  - [x] Create `src/components/shared/AnalyticsLoader.tsx` importing `{ Analytics }` from `'@vercel/analytics/react'` — see canonical pattern in Dev Notes

- [x] Task 6: Create E2E tests (AC: all)
  - [x] Create E2E directory if it doesn't exist: `mkdir -p tests/e2e`
  - [x] Create `tests/e2e/cookie-consent.spec.ts`
  - [x] Test: banner appears for new visitor (no localStorage entry)
  - [x] Test: "Accept All" → banner dismisses + `analytics: true` in store
  - [x] Test: "Decline All" → banner dismisses + `analytics: false` in store
  - [x] Test: "Customize" → shows preference panel + save sets custom preferences
  - [x] Test: returning visitor with valid consent → no banner shown
  - [x] Test: expired consent (set `expiresAt` to past timestamp in localStorage) → banner re-appears
  - [x] Test: keyboard navigation — Tab between all buttons, Enter/Space activates them
  - [x] Run `axe-playwright` accessibility scan on banner (ARCH16, NFR-ACC2, FR53)

- [x] Task 7: Create unit tests
  - [x] Create `src/stores/__tests__/cookie-consent.test.ts`
  - [x] Add comment at top: `// NOTE: Vitest runs in 'node' environment — localStorage is unavailable; persist middleware falls back to null storage (no-op). State is in-memory only. Persistence is covered by E2E tests.`
  - [x] Test `acceptAll()`: sets `analytics: true`, `consentGiven: true`, `expiresAt` ~12 months from now
  - [x] Test `declineAll()`: sets `analytics: false`, `consentGiven: true`, future `expiresAt`
  - [x] Test `hasValidConsent()`: returns `false` when `consentGiven: false`
  - [x] Test `hasValidConsent()`: returns `false` when `expiresAt` is in the past (calls `resetConsent()`)
  - [x] Test `hasValidConsent()`: returns `true` when `consentGiven: true` and `expiresAt` is future

## Dev Notes

### Tech Stack Introduction (new in this story)

- **Zustand** — `pnpm add zustand` — client-side state management; `persist` middleware for localStorage
- Package manager: always `pnpm`

**CRITICAL: Do NOT run `npx shadcn@latest init` in this story.** shadcn/ui is initialized in Story 1.4 (Anonymous Cold Start Deck Study) when the first product UI is built. Build `CookieConsentBanner.tsx` with plain Tailwind CSS only.

### Storage Mechanism Clarification

Architecture's "cookie-consent=granted|denied cookie" refers to the **localStorage key name**, not an HTTP Set-Cookie header. Consent is stored in localStorage via Zustand `persist` — no HTTP cookies, no DB writes, no Supabase calls.

### `src/lib/analytics.ts` — DO NOT MODIFY

`src/lib/analytics.ts` already exists from Story 1-1. It exports `trackEvent()` using Vercel Analytics (`@vercel/analytics`). **Do not create, overwrite, or modify this file.**

The `<Analytics />` React script component comes from the library itself: import it as `import { Analytics } from '@vercel/analytics/react'` in `AnalyticsLoader.tsx` directly. The `@vercel/analytics` package is already installed at `^2.0.1`.

### Canonical Zustand Consent Store

```typescript
// src/stores/cookie-consent.ts
'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const CONSENT_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000 // 12 months

interface ConsentState {
  analytics: boolean
  consentGiven: boolean
  expiresAt: number | null
  acceptAll: () => void
  declineAll: () => void
  setAnalytics: (value: boolean) => void
  hasValidConsent: () => boolean
  resetConsent: () => void
}

export const useCookieConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      analytics: false,
      consentGiven: false,
      expiresAt: null,

      acceptAll: () => set({
        analytics: true,
        consentGiven: true,
        expiresAt: Date.now() + CONSENT_EXPIRY_MS,
      }),

      declineAll: () => set({
        analytics: false,
        consentGiven: true,
        expiresAt: Date.now() + CONSENT_EXPIRY_MS,
      }),

      setAnalytics: (value: boolean) => set({
        analytics: value,
        consentGiven: true,
        expiresAt: Date.now() + CONSENT_EXPIRY_MS,
      }),

      hasValidConsent: () => {
        const { consentGiven, expiresAt } = get()
        if (!consentGiven || !expiresAt) return false
        // Guard: localStorage may deserialise numbers as strings in some environments
        const exp = typeof expiresAt === 'string' ? parseInt(expiresAt as string, 10) : expiresAt
        if (isNaN(exp)) { get().resetConsent(); return false }
        return Date.now() <= exp
      },

      resetConsent: () => set({
        analytics: false,
        consentGiven: false,
        expiresAt: null,
      }),
    }),
    {
      name: 'cookie-consent',
      storage: createJSONStorage(() => {
        // Fallback for private browsing / Safari ITP where localStorage may be blocked
        try { return localStorage } catch { return { getItem: () => null, setItem: () => {}, removeItem: () => {} } }
      }),
      // Exclude function references — only persist data fields
      partialize: (state) => ({
        analytics: state.analytics,
        consentGiven: state.consentGiven,
        expiresAt: state.expiresAt,
      }),
    }
  )
)
```

### Hydration Safety Pattern — CRITICAL (prevents React hydration mismatch warnings)

Zustand `persist` reads localStorage which is client-only. Without hydration safety, the banner flashes on load for returning visitors (renders briefly, then hides). The `isLoaded` pattern prevents this:

```typescript
// src/hooks/useCookieConsent.ts
'use client'
import { useEffect, useState } from 'react'
import { useCookieConsentStore } from '@/stores/cookie-consent'

export function useCookieConsent() {
  const [isLoaded, setIsLoaded] = useState(false)
  const store = useCookieConsentStore()

  // isLoaded = false on SSR and first render; true only after client hydration
  useEffect(() => {
    setIsLoaded(true)
    // Check expiry on mount — reset if consent has expired (triggers banner re-appearance)
    const { consentGiven, expiresAt, resetConsent } = useCookieConsentStore.getState()
    if (consentGiven && expiresAt && Date.now() > expiresAt) {
      resetConsent()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    consent: {
      analytics: store.analytics,
      consentGiven: store.consentGiven,
    },
    hasValidConsent: store.hasValidConsent,
    acceptAll: store.acceptAll,
    declineAll: store.declineAll,
    setAnalytics: store.setAnalytics,
    isLoaded,
  }
}
```

**Why:** `isLoaded` is `false` on both server and first client render (matches SSR output). After hydration, `useEffect` sets it `true`. Banner renders only when `isLoaded && !hasValidConsent()` — no flash, no mismatch.

### Focus Trap Canonical Pattern

Required for WCAG 2.1 AA SC 2.1.2. Add to `CookieConsentBanner.tsx`:

```typescript
import { useRef, useEffect } from 'react'

// Inside component:
const bannerRef = useRef<HTMLDivElement>(null)

// Auto-focus first button on mount and when switching to/from Customize view
useEffect(() => {
  const firstButton = bannerRef.current?.querySelector<HTMLElement>('button')
  firstButton?.focus()
}, [showCustomize])

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key !== 'Tab') return
  const focusable = Array.from(
    bannerRef.current?.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])') ?? []
  ).filter(el => !el.hasAttribute('disabled'))
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus() }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus() }
  }
}

// Apply ref and handler to the root div:
// <div ref={bannerRef} onKeyDown={handleKeyDown} role="dialog" ...>
```

**Note:** Do NOT add `aria-live="polite"` to the dialog root — `role="dialog"` already triggers screen reader announcement on appearance; adding `aria-live` causes double-announcements. Only use `aria-live` on inline status regions if needed.

### Canonical CookieConsentBanner Component

```typescript
// src/components/shared/CookieConsentBanner.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { useCookieConsent } from '@/hooks/useCookieConsent'

export function CookieConsentBanner() {
  const { consent, hasValidConsent, acceptAll, declineAll, setAnalytics, isLoaded } = useCookieConsent()
  const [showCustomize, setShowCustomize] = useState(false)
  // Initialize from stored consent — prevents showing wrong state if user opens Customize after accepting
  const [analyticsChecked, setAnalyticsChecked] = useState(consent.analytics)
  const bannerRef = useRef<HTMLDivElement>(null)

  // Auto-focus first button on mount and on view switch
  useEffect(() => {
    const firstButton = bannerRef.current?.querySelector<HTMLElement>('button')
    firstButton?.focus()
  }, [showCustomize])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const focusable = Array.from(
      bannerRef.current?.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])') ?? []
    ).filter(el => !el.hasAttribute('disabled'))
    if (focusable.length === 0) return
    const first = focusable[0]; const last = focusable[focusable.length - 1]
    if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus() } }
    else { if (document.activeElement === last) { e.preventDefault(); first.focus() } }
  }

  // Never render on SSR or if valid consent already exists
  if (!isLoaded || hasValidConsent()) return null

  if (showCustomize) {
    return (
      <div
        ref={bannerRef}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Cookie preferences"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-4 shadow-lg"
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Customize Cookie Preferences</h2>
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-3 cursor-not-allowed opacity-60">
              <input type="checkbox" checked disabled className="h-4 w-4" />
              <span className="text-sm text-gray-900">
                <strong>Functional cookies</strong> — Required for the app to work (always active)
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={analyticsChecked}
                onChange={(e) => setAnalyticsChecked(e.target.checked)}
                className="h-4 w-4 focus:ring-2 focus:ring-gray-900"
              />
              <span className="text-sm text-gray-900">
                <strong>Analytics cookies</strong> — Help us understand how you use the app
              </span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCustomize(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Back
            </button>
            <button
              onClick={() => { setAnalytics(analyticsChecked); setShowCustomize(false) }}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={bannerRef}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-4 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="flex-1 text-sm text-gray-900">
          We use cookies to improve your experience. Analytics cookies help us understand how you use the app.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={declineAll}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Decline All
          </button>
          <button
            onClick={() => setShowCustomize(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Customize
          </button>
          <button
            onClick={acceptAll}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Accessibility compliance (NFR-ACC2, NFR-ACC4, FR53):**
- `role="dialog"` + `aria-modal="true"` + `aria-label` on root element (screen reader announces banner on focus)
- Focus trap via `bannerRef` + `onKeyDown` + `useEffect` auto-focus — keyboard users cannot escape to obscured page content
- All interactive elements have `focus:ring-2 focus:ring-offset-2` (visible keyboard focus)
- `text-gray-900` on white background = ~17.7:1 contrast ratio (exceeds 4.5:1 NFR-ACC4)
- Tab order follows DOM order — no manual `tabIndex` needed
- Buttons activate with Enter and Space (native `<button>` behavior)
- NO `aria-live` on dialog root — `role="dialog"` already handles announcement; `aria-live` would cause double-reads

### Root Layout Update

```typescript
// src/app/layout.tsx — add CookieConsentBanner
import { CookieConsentBanner } from '@/components/shared/CookieConsentBanner'

// Inside <body>:
// <CookieConsentBanner />  ← add after {children}
```

**Analytics integration:** `src/lib/analytics.ts` already exists — do not touch it. The conditional render belongs inside a dedicated `<AnalyticsLoader />` client component (not directly in RSC layout). The `<Analytics />` script component is imported from `@vercel/analytics/react`:

```typescript
// src/components/shared/AnalyticsLoader.tsx
'use client'
import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'  // NOT from '@/lib/analytics' — that file exports trackEvent(), not the script component
import { useCookieConsentStore } from '@/stores/cookie-consent'

export function AnalyticsLoader() {
  const [ready, setReady] = useState(false)
  const analytics = useCookieConsentStore((s) => s.analytics)
  const consentGiven = useCookieConsentStore((s) => s.consentGiven)

  useEffect(() => { setReady(true) }, [])

  // Hydration guard: never render analytics before client-side store is confirmed
  if (!ready || !consentGiven || !analytics) return null
  return <Analytics />
}
```

Add `<AnalyticsLoader />` to root layout alongside `<CookieConsentBanner />`.

### File Structure for This Story

New files:
```
src/
  components/
    shared/
      CookieConsentBanner.tsx     ← NEW: consent banner (client, plain Tailwind, NO shadcn)
      AnalyticsLoader.tsx         ← NEW: conditionally renders analytics (client component)
  hooks/
    useCookieConsent.ts           ← NEW: hydration-safe hook wrapping consent store
  stores/
    cookie-consent.ts             ← NEW: Zustand persist store
    __tests__/
      cookie-consent.test.ts      ← NEW: Vitest unit tests
  lib/
    analytics.ts                  ← DO NOT MODIFY — already exists from Story 1-1 with trackEvent()

Modified files:
  src/app/layout.tsx              ← MODIFY: add CookieConsentBanner + AnalyticsLoader

New test files:
  tests/e2e/
    cookie-consent.spec.ts        ← NEW: Playwright E2E tests
```

### Architecture Compliance Checklist (Anti-Disaster)

- [ ] `CookieConsentBanner.tsx` has `'use client'` directive — banner uses hooks and browser APIs
- [ ] `useCookieConsentStore` uses Zustand `persist` with `createJSONStorage(() => localStorage)`
- [ ] `partialize` excludes function references — only `analytics`, `consentGiven`, `expiresAt` persisted
- [ ] `isLoaded` guard prevents banner render before hydration (no SSR/client mismatch warnings)
- [ ] `hasValidConsent()` checks BOTH `consentGiven` AND `expiresAt > Date.now()`
- [ ] Expired consent reset happens in `useCookieConsent` hook's `useEffect` on mount — NOT inside `hasValidConsent()` getter (side effects in selectors cause render loops)
- [ ] `analyticsChecked` local state in Customize view initialized from `consent.analytics`, not hardcoded `false`
- [ ] No DB writes — no Supabase calls anywhere in this story
- [ ] `profiles.gdprConsentAt` is NOT updated here — that belongs to Story 1.5 (user registration)
- [ ] `analytics: false` in initial state — analytics blocked by default until consent
- [ ] shadcn/ui NOT initialized — plain Tailwind only
- [ ] `src/stores/` (plural) — NOT `src/store/` (singular) — matches architecture folder structure
- [ ] `AnalyticsLoader` is a separate Client Component — RSC root layout cannot use hooks directly
- [ ] `AnalyticsLoader.tsx` imports `{ Analytics }` from `'@vercel/analytics/react'` — NOT from `'@/lib/analytics'` (that file exports `trackEvent()`, not the script component)
- [ ] `src/lib/analytics.ts` is NOT created or modified — it already exists from Story 1-1
- [ ] `CookieConsentBanner.tsx` implements focus trap via `bannerRef` + `onKeyDown` + `useEffect` auto-focus (WCAG 2.1 AA SC 2.1.2)
- [ ] NO `aria-live` on dialog root elements — `role="dialog"` handles screen reader announcement

### Previous Story (1.2) Intelligence

Story 1.2 established:
- `src/middleware.ts` — session refresh + auth rate limiting; do NOT modify in this story
- `src/lib/supabase/server.ts` + `src/lib/supabase/user.ts` — not used in this story
- `src/server/db/schema/users.ts` — `profiles.gdprConsentAt` column exists but is NOT set here
- `src/types/index.ts` — `Result<T>` type available (not needed for this client-only story)
- `src/lib/constants.ts` — check if exists; do NOT duplicate constants
- Package manager: `pnpm` always

**Scope boundary:** Story 1.3 is purely client-side (localStorage + React). No auth, no DB, no Server Actions. Keep it simple.

### Story Definition of Done

A story is complete when ALL are true:
1. **Unit tests** — Vitest: store actions, expiry reset, `hasValidConsent()` logic pass
2. **E2E tests** — Playwright: new visitor sees banner; accept/decline works; returning visitor skips banner; expired consent shows banner
3. **Accessibility** — `axe-playwright` passes on banner (no violations)
4. **No hydration warnings** — no React hydration mismatch in browser console
5. **Analytics gated** — `<Analytics />` only renders after `analytics: true` consent
6. **No DB writes** — confirmed: no Supabase calls in this story's code

### References

- Cookie consent architecture: `_bmad-output/planning-artifacts/architecture.md` (GDPR Cookie Consent section)
- Component location: `_bmad-output/planning-artifacts/architecture.md` (Frontend Structure — `src/components/shared/`)
- Store/hook location: `_bmad-output/planning-artifacts/architecture.md` (`src/stores/`, `src/hooks/`)
- FR9, FR51, FR53: `_bmad-output/planning-artifacts/epics.md` (Story 1.3)
- NFR-GDPR3: functional cookies only until consent granted; analytics blocked until opt-in
- NFR-ACC2: full keyboard accessibility on all interactive elements
- NFR-ACC4: minimum 4.5:1 color contrast for normal text
- ARCH16: `axe-playwright` in E2E suite for automated WCAG 2.1 AA checks
- Previous story: `_bmad-output/implementation-artifacts/1-2-supabase-foundation-and-auth-infrastructure.md`
- Zustand persist docs: https://zustand.docs.pmnd.rs/integrations/persisting-store-data

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Unit test fixed: `hasValidConsent()` returns `false` for expired consent but does NOT call `resetConsent()` — that is the hook's useEffect responsibility per architecture. Test updated to match correct behavior.

Code review (3 parallel layers): 3 patches applied post-review —
1. Auto-focus `useEffect` dependency added `isLoaded` so initial banner appearance triggers focus (P1)
2. NaN guard moved from `hasValidConsent()` getter to `useCookieConsent` hook's `useEffect` per architecture constraint (P2)
3. E2E keyboard test extended with Shift+Tab wrap-around assertion (P3)

### Completion Notes List

- Zustand 5.0.12 installed as regular dependency
- `src/stores/cookie-consent.ts` — persist store with `acceptAll`, `declineAll`, `setAnalytics`, `hasValidConsent`, `resetConsent`; localStorage fallback for private browsing/Safari ITP
- `src/hooks/useCookieConsent.ts` — hydration-safe hook; `isLoaded` prevents SSR flash; expiry reset in `useEffect` on mount
- `src/components/shared/CookieConsentBanner.tsx` — client component; default + customize views; focus trap (WCAG 2.1 AA SC 2.1.2); no shadcn; no `aria-live` on dialog root
- `src/components/shared/AnalyticsLoader.tsx` — consent-gated analytics; imports `{ Analytics }` from `@vercel/analytics/react` (NOT `@/lib/analytics`)
- `src/app/layout.tsx` — `CookieConsentBanner` + `AnalyticsLoader` added after `{children}`
- `tests/e2e/cookie-consent.spec.ts` — 6 Playwright tests covering all ACs + axe accessibility scan; `@axe-core/playwright` 4.11.1 installed
- `src/stores/__tests__/cookie-consent.test.ts` — 9 Vitest unit tests; all pass; node environment noted
- All 37 existing tests pass (0 regressions). No new TS errors introduced.

### File List

- `src/stores/cookie-consent.ts` (new)
- `src/hooks/useCookieConsent.ts` (new)
- `src/components/shared/CookieConsentBanner.tsx` (new)
- `src/components/shared/AnalyticsLoader.tsx` (new)
- `src/app/layout.tsx` (modified)
- `src/stores/__tests__/cookie-consent.test.ts` (new)
- `tests/e2e/cookie-consent.spec.ts` (new)
- `package.json` (modified — zustand 5.0.12, @axe-core/playwright 4.11.1)
- `pnpm-lock.yaml` (modified)
