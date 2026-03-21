# Story 1.3: Cookie Consent Banner & GDPR Consent Storage

Status: ready-for-dev

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

- [ ] Task 1: Install Zustand (AC: all)
  - [ ] `pnpm add zustand`
  - [ ] Verify installed as a regular dependency (not devDependency)

- [ ] Task 2: Create cookie consent Zustand store (AC: #2, #3, #4)
  - [ ] Create `src/stores/cookie-consent.ts` using Zustand `persist` middleware (see canonical pattern in Dev Notes)
  - [ ] Store tracks: `analytics: boolean`, `consentGiven: boolean`, `expiresAt: number | null`
  - [ ] Implement `acceptAll()`, `declineAll()`, `setAnalytics(value: boolean)`, `resetConsent()` actions
  - [ ] Implement `hasValidConsent()` — returns `false` if `!consentGiven || !expiresAt || Date.now() > expiresAt`
  - [ ] On expiry check in `hasValidConsent()`: call `resetConsent()` and return `false` (banner re-appears silently)
  - [ ] Persist to localStorage key `'cookie-consent'` using `createJSONStorage(() => localStorage)`
  - [ ] Use `partialize` to exclude function references from persistence (only persist `analytics`, `consentGiven`, `expiresAt`)
  - [ ] Set expiry: `expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000` on accept/decline

- [ ] Task 3: Create useCookieConsent hook (AC: #4)
  - [ ] Create `src/hooks/useCookieConsent.ts` (see canonical pattern in Dev Notes)
  - [ ] Add hydration safety: `isLoaded` state starts `false`, set to `true` in `useEffect`
  - [ ] Return: `{ consent, hasValidConsent, acceptAll, declineAll, setAnalytics, isLoaded }`
  - [ ] `isLoaded` MUST be `false` until client hydration — prevents banner flash on returning visitors

- [ ] Task 4: Create CookieConsentBanner component (AC: #1, #2, #3, #5)
  - [ ] Create `src/components/shared/CookieConsentBanner.tsx` (see canonical pattern in Dev Notes)
  - [ ] Add `'use client'` directive at top of file
  - [ ] Render `null` until `isLoaded && !hasValidConsent()` — never render on SSR
  - [ ] Default view: three buttons — "Accept All", "Decline All", "Customize"
  - [ ] Customize view: checkbox for analytics consent + "Save Preferences" + "Back" buttons
  - [ ] Functional cookies checkbox always checked + disabled (required, cannot be declined)
  - [ ] All buttons: visible focus rings, keyboard-activatable (`focus:ring-2 focus:ring-offset-2`)
  - [ ] Root element: `role="dialog"` + `aria-label="Cookie consent"` (screen reader support)
  - [ ] Color contrast: use `text-gray-900` on white background (17.7:1 — exceeds 4.5:1 NFR-ACC4)
  - [ ] Fixed at bottom of viewport: `fixed bottom-0 left-0 right-0 z-50`
  - [ ] **DO NOT use shadcn/ui** — plain Tailwind CSS only (shadcn is initialized in Story 1.4)

- [ ] Task 5: Update root layout (AC: #1)
  - [ ] Open `src/app/layout.tsx`
  - [ ] Import and render `<CookieConsentBanner />` inside `<body>` (after `{children}`)
  - [ ] Import `Analytics` from `@/lib/analytics` and render conditionally — see Dev Notes for pattern

- [ ] Task 6: Create E2E tests (AC: all)
  - [ ] Create `tests/e2e/cookie-consent.spec.ts`
  - [ ] Test: banner appears for new visitor (no localStorage entry)
  - [ ] Test: "Accept All" → banner dismisses + `analytics: true` in store
  - [ ] Test: "Decline All" → banner dismisses + `analytics: false` in store
  - [ ] Test: "Customize" → shows preference panel + save sets custom preferences
  - [ ] Test: returning visitor with valid consent → no banner shown
  - [ ] Test: expired consent (set `expiresAt` to past timestamp in localStorage) → banner re-appears
  - [ ] Test: keyboard navigation — Tab between all buttons, Enter/Space activates them
  - [ ] Run `axe-playwright` accessibility scan on banner (ARCH16, NFR-ACC2, FR53)

- [ ] Task 7: Create unit tests
  - [ ] Create `src/stores/__tests__/cookie-consent.test.ts`
  - [ ] Test `acceptAll()`: sets `analytics: true`, `consentGiven: true`, `expiresAt` ~12 months from now
  - [ ] Test `declineAll()`: sets `analytics: false`, `consentGiven: true`, future `expiresAt`
  - [ ] Test `hasValidConsent()`: returns `false` when `consentGiven: false`
  - [ ] Test `hasValidConsent()`: returns `false` when `expiresAt` is in the past (calls `resetConsent()`)
  - [ ] Test `hasValidConsent()`: returns `true` when `consentGiven: true` and `expiresAt` is future

## Dev Notes

### Tech Stack Introduction (new in this story)

- **Zustand** — `pnpm add zustand` — client-side state management; `persist` middleware for localStorage
- Package manager: always `pnpm`

**CRITICAL: Do NOT run `npx shadcn@latest init` in this story.** shadcn/ui is initialized in Story 1.4 (Anonymous Cold Start Deck Study) when the first product UI is built. Build `CookieConsentBanner.tsx` with plain Tailwind CSS only.

### Storage Mechanism Clarification

Architecture says "Consent stored in `cookie-consent=granted|denied` cookie (not DB)". **This refers to the localStorage key name `cookie-consent`**, not an HTTP Set-Cookie header. Implementation uses:
- **localStorage** (via Zustand `persist` middleware) — stores `analytics`, `consentGiven`, `expiresAt`
- **No HTTP cookies** are set for consent preferences
- **No DB writes** — `profiles.gdprConsentAt` is set in Story 1.5 (user registration), not here
- No Supabase calls in this story whatsoever

### `src/lib/analytics.ts` — Existing File

The architecture defines `src/lib/analytics.ts` as the analytics integration point. This file may not exist yet (Story 1.1 scaffold). For this story:
- Create `src/lib/analytics.ts` as a stub Client Component exporting `<Analytics />` that returns `null`
- Future stories will replace the stub with a real analytics provider (Vercel Analytics, PostHog, etc.)
- The root layout renders `<Analytics />` conditionally inside a client component wrapper

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
        if (Date.now() > expiresAt) {
          get().resetConsent()
          return false
        }
        return true
      },

      resetConsent: () => set({
        analytics: false,
        consentGiven: false,
        expiresAt: null,
      }),
    }),
    {
      name: 'cookie-consent',
      storage: createJSONStorage(() => localStorage),
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

### Canonical CookieConsentBanner Component

```typescript
// src/components/shared/CookieConsentBanner.tsx
'use client'
import { useState } from 'react'
import { useCookieConsent } from '@/hooks/useCookieConsent'

export function CookieConsentBanner() {
  const { consent, hasValidConsent, acceptAll, declineAll, setAnalytics, isLoaded } = useCookieConsent()
  const [showCustomize, setShowCustomize] = useState(false)
  const [analyticsChecked, setAnalyticsChecked] = useState(false)

  // Never render on SSR or if valid consent already exists
  if (!isLoaded || hasValidConsent()) return null

  if (showCustomize) {
    return (
      <div
        role="dialog"
        aria-modal="false"
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
              onClick={() => setAnalytics(analyticsChecked)}
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
      role="dialog"
      aria-modal="false"
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
- `role="dialog"` + `aria-label` on root element (screen reader announces banner)
- All interactive elements have `focus:ring-2 focus:ring-offset-2` (visible keyboard focus)
- `text-gray-900` on white background = ~17.7:1 contrast ratio (exceeds 4.5:1 NFR-ACC4)
- Tab order follows DOM order — no manual `tabIndex` needed
- Buttons activate with Enter and Space (native `<button>` behavior)

### Root Layout Update

```typescript
// src/app/layout.tsx — add CookieConsentBanner
import { CookieConsentBanner } from '@/components/shared/CookieConsentBanner'

// Inside <body>:
// <CookieConsentBanner />  ← add after {children}
```

**Analytics integration:** `src/lib/analytics.ts` is the integration point for the analytics provider. Create it as a stub for now. The conditional render `{consent.analytics && <Analytics />}` belongs inside a dedicated `<AnalyticsLoader />` client component (not directly in RSC layout):

```typescript
// src/lib/analytics.ts
'use client'
// Stub — replace with real analytics provider (Vercel Analytics, PostHog, etc.) in a future story
export function Analytics() {
  return null
}
```

```typescript
// src/components/shared/AnalyticsLoader.tsx
'use client'
import { Analytics } from '@/lib/analytics'
import { useCookieConsentStore } from '@/stores/cookie-consent'

export function AnalyticsLoader() {
  const analytics = useCookieConsentStore((s) => s.analytics)
  const consentGiven = useCookieConsentStore((s) => s.consentGiven)
  if (!consentGiven || !analytics) return null
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
    analytics.ts                  ← NEW (or UPDATE if exists): analytics stub

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
- [ ] Expired consent auto-resets via `resetConsent()` call inside `hasValidConsent()`
- [ ] No DB writes — no Supabase calls anywhere in this story
- [ ] `profiles.gdprConsentAt` is NOT updated here — that belongs to Story 1.5 (user registration)
- [ ] `analytics: false` in initial state — analytics blocked by default until consent
- [ ] shadcn/ui NOT initialized — plain Tailwind only
- [ ] `src/stores/` (plural) — NOT `src/store/` (singular) — matches architecture folder structure
- [ ] `AnalyticsLoader` is a separate Client Component — RSC root layout cannot use hooks directly

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

### Completion Notes List

### File List
