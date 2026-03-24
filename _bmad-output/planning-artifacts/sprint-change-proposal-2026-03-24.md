# Sprint Change Proposal — Story 3-7: Marketing Landing Page Impact

**Date:** 2026-03-24
**Status:** Approved
**Scope:** Minor
**Triggered by:** Story 3-7 (Marketing Landing Page) added to Epic 3

---

## Section 1: Issue Summary

Story 3-7 implements the `(marketing)/` route group that the architecture always specified but no story ever covered. Its addition revealed three categories of impact:

1. **Documentation drift** — Two `done` stories (1-4, 1-8) use "homepage" as a synonym for the cold-start experience. That language is now outdated but code is unaffected.
2. **Missing implementation gap** — `cold_start_viewed` analytics event is defined in `AppEvent` type but never called anywhere in the codebase. Story 1-4's Definition of Done required it (FR58). Missed.
3. **Future funnel impact** — Epic 9 / Story 9-7 funnel definition will need a `landing_page_viewed` step prepended when that story is created.

---

## Section 2: Impact Analysis

| # | Story / Artifact | Finding | Severity |
|---|---|---|---|
| 1 | Story 1-4 (`done`) | AC says "land on homepage → cold-start visible." `/` now shows landing page; cold-start reachable via CTA. Implementation correct, docs outdated. | Documentation |
| 2 | Story 1-8 (`done`) | AC says "redirected to homepage (cold start experience)" after logout. After 3-7, `/` shows marketing page. `AppNav` code is correct (`push('/')`). | Documentation |
| 3 | Story 1-4 (`done`) | `cold_start_viewed` event defined in `AppEvent` but **never called** in codebase. Missing per FR58 + DoD. | **Code gap** |
| 4 | Story 3-7 (`ready-for-dev`) | Absorbs the `cold_start_viewed` fix as Task 8 — already in story file. | Scope addition |
| 5 | Epic 9 / Story 9-7 (`backlog`) | Funnel top changes: landing page → cold-start → signup. Needs `landing_page_viewed` event + funnel update when created. | Future flag |
| 6 | Architecture / PRD | No conflicts. Story 3-7 implements what architecture already specified. | None |

---

## Section 3: Recommended Approach

**Option 1 — Direct Adjustment** (selected)

No rollback. No MVP scope change. No epic resequencing. Absorb the `cold_start_viewed` tracking fix into Story 3-7 (one additional task), add two documentation annotations to completed stories, and flag the funnel note for Story 9-7 creation time.

**Effort:** Low | **Risk:** Low | **Timeline impact:** Zero

---

## Section 4: Change Proposals Applied

### Change 1 — Story 1-4 annotation ✅
Added to `_bmad-output/implementation-artifacts/1-4-anonymous-cold-start-deck-study.md` Dev Agent Record:
- Notes that story 3-7 formalizes `/` as marketing landing page
- Notes that AC phrase "land on the app homepage" is outdated
- Notes that `cold_start_viewed` gap is closed in Story 3-7

### Change 2 — Story 1-8 annotation ✅
Added to `_bmad-output/implementation-artifacts/1-8-user-login-and-logout.md` Dev Agent Record:
- Notes that post-logout redirect to `/` now lands on marketing landing page
- Notes that AC phrase "(cold start experience)" is outdated; code is correct

### Change 3 — Story 3-7: Task 8 added ✅
Added to `_bmad-output/implementation-artifacts/3-7-marketing-landing-page.md`:
- Task 8: Add `trackEvent('cold_start_viewed', {})` to `src/app/cold-start/page.tsx`
- Closes FR58 gap from Story 1-4

### Change 4 — Story 3-7: Future analytics note ✅
Added to `_bmad-output/implementation-artifacts/3-7-marketing-landing-page.md` Dev Notes:
- Documents `landing_page_viewed` event deferred to Epic 9 / Story 9-7
- Specifies what needs to happen at that time: AppEvent update, trackEvent call, funnel update, FR58 PRD update

---

## Section 5: Future Flags (SM action when creating Story 9-7)

When Story 9-7 (Funnel Analytics) is created:
- Add `'landing_page_viewed'` to `AppEvent` union in `src/lib/analytics.ts`
- Add `trackEvent('landing_page_viewed', {})` to `src/app/(marketing)/page.tsx`
- Update funnel: **Landing Page Viewed → Cold Start Viewed → Signup → First Deck Created → First Study Session → Upgrade**
- Update FR58 in `_bmad-output/planning-artifacts/prd.md` to include `landing_page_viewed`

---

## Section 6: Handoff

**Scope classification: Minor — direct implementation by dev team**

| Change | Responsible | Status |
|--------|-------------|--------|
| Story 1-4 annotation | SM | ✅ Applied |
| Story 1-8 annotation | SM | ✅ Applied |
| Story 3-7 Task 8 | Dev (during 3-7 implementation) | ✅ In story file |
| Story 3-7 analytics note | Dev (awareness only) | ✅ In story file |
| Story 9-7 funnel flag | SM (when creating 9-7) | 📋 Documented here |

**Success criteria:** Story 3-7 implemented with `cold_start_viewed` firing on cold-start page load. Post-3-7, authenticated users hitting `/` redirect to `/decks`. Unauthenticated users see the landing page.
