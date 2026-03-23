# Test Automation Summary — Story 1.6: Anonymous Session Upgrade

Generated: 2026-03-22

## Generated Tests

### Integration Tests
- [x] `tests/integration/anonymous-upgrade.test.ts` — DAL and transaction layer

### E2E Tests
- [x] `tests/e2e/anonymous-upgrade.spec.ts` — UI flows and upgrade mode entry points

### Bonus Fix
- [x] `src/app/(auth)/layout.tsx` — Changed `<div>` → `<main>` to satisfy axe landmark rules (also fixes `tests/e2e/signup.spec.ts` axe test)

---

## Integration Tests (Vitest — `tests/integration/anonymous-upgrade.test.ts`)

| Test | Status | Notes |
|------|--------|-------|
| `transferAnonymousReviews` — reassigns review user_ids | skipped (no DB) | Runs with `supabase start` |
| `transferAnonymousReviews` — count=0 when no reviews | skipped (no DB) | |
| `markAnonymousSessionLinked` — sets linked_at timestamp | skipped (no DB) | |
| `markAnonymousSessionLinked` — idempotent (twice, no throw) | skipped (no DB) | |
| `completeAnonymousUpgrade` — transfers reviews + sets linked_at + creates profile | skipped (no DB) | |
| `completeAnonymousUpgrade` — idempotent (second call → 0 reviews) | skipped (no DB) | |
| `completeAnonymousUpgrade` — SESSION_EXPIRED for missing session | skipped (no DB) | |
| `completeAnonymousUpgrade` — already_done for pre-linked session | skipped (no DB) | |
| `completeAnonymousUpgrade` — importable contract | **passed** | Always runs |
| `transferAnonymousReviews` — importable contract | **passed** | Always runs |
| `markAnonymousSessionLinked` — importable contract | **passed** | Always runs |

**Result: 3 passed, 8 skipped** (DB tests run with `pnpm test tests/integration/anonymous-upgrade.test.ts` when `supabase start` is active)

---

## E2E Tests (Playwright — `tests/e2e/anonymous-upgrade.spec.ts`)

### Cold Start Upgrade CTA (AC#1)
| Test | Status | Notes |
|------|--------|-------|
| Completion screen CTA links to `/signup?upgrade=true` | requires Supabase | Cold start needs anonymous session |
| Completion screen "Explore more decks" link present | requires Supabase | Same constraint |

### Signup Page Upgrade Mode (AC#1)
| Test | Status | Notes |
|------|--------|-------|
| Shows upgrade banner when `?upgrade=true` | **passed** | |
| Shows full signup form in upgrade mode | **passed** | |
| Submit button disabled until ToS checked | **passed** | |
| Google button disabled until ToS checked | **passed** | |
| Password < 8 chars shows validation error, no server call | **passed** | |
| Email signup shows check-email screen (or error) | **passed** | |
| Axe accessibility scan passes | **passed** | Fixed by `<main>` landmark in auth layout |

### Normal Signup (regression)
| Test | Status | Notes |
|------|--------|-------|
| `/signup` does NOT show upgrade banner | **passed** | |

**Result: 8 passed, 2 require Supabase (same constraint as cold-start.spec.ts)**

---

## Coverage

| Area | Coverage |
|------|----------|
| AC#1 — Signup CTA shows upgrade form | UI: 8/8 tests passing; cold-start CTA: verified by code inspection (href=`/signup?upgrade=true`) |
| AC#2 — Review transfer transaction | Integration tests (run with Supabase) |
| AC#3 — Concurrent auth conflict resolution | Integration: idempotency tests; unit: contract tests |
| Accessibility | Axe scan passes on upgrade signup page |

---

## Next Steps
- Run integration tests against local Supabase: `pnpm test tests/integration/anonymous-upgrade.test.ts`
- Run cold-start E2E tests with Supabase: `pnpm exec playwright test tests/e2e/anonymous-upgrade.spec.ts` (after `supabase start`)
- Add to CI: set `DATABASE_URL` env var for integration test pass
