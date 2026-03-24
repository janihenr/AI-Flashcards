import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// ─── Auth guard ────────────────────────────────────────────────────────────────

test.describe('Privacy settings — auth guard', () => {
  test('unauthenticated user visiting /settings/privacy is redirected to /login', async ({ page }) => {
    await page.goto('/settings/privacy')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirect preserves redirectTo query param', async ({ page }) => {
    await page.goto('/settings/privacy')
    await expect(page).toHaveURL(/redirectTo=%2Fsettings%2Fprivacy/)
  })
})

// ─── Account deleted page (public — fully testable) ───────────────────────────

test.describe('/account-deleted page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account-deleted')
  })

  test('renders account deletion confirmation heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /account deleted/i })).toBeVisible()
  })

  test('states data will be erased within 30 days', async ({ page }) => {
    await expect(page.getByText(/30 days/i)).toBeVisible()
  })

  test('shows a link to return to home', async ({ page }) => {
    const homeLink = page.getByRole('link', { name: /return to home/i })
    await expect(homeLink).toBeVisible()
    await expect(homeLink).toHaveAttribute('href', '/')
  })

  test('/account-deleted page has no accessibility violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toHaveLength(0)
  })
})

// ─── Login page accessibility baseline for settings redirect ──────────────────

test.describe('Privacy settings — login redirect has no accessibility violations', () => {
  test('login page (redirect target) has no accessibility violations', async ({ page }) => {
    await page.goto('/settings/privacy')
    await expect(page).toHaveURL(/\/login/)
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toHaveLength(0)
  })
})

// ─── Manual verification required (needs live authenticated session) ──────────
//
// The following flows require a real Supabase session. Verify manually:
//
// Data export (Story 2.4):
// [ ] Privacy page renders at /settings/privacy with "Your Personal Data" section
// [ ] "Request data export" button visible when no job exists
// [ ] Clicking request → button replaced with "Export in progress" message
// [ ] Once export is ready (may take time in dev): download link appears
// [ ] Download link produces valid JSON file with expected top-level keys:
//     exportedAt, format, profile, decks, reviews
// [ ] Retrying while job is processing shows "already in progress" inline error
// [ ] Accessibility: /settings/privacy has no axe violations (authenticated)
//
// Data summary (Story 2.5):
// [ ] Summary section lists: display name, subscription tier, account created date,
//     GDPR consent date, deck count, note count, card count, review count,
//     active sessions, Learning Fingerprint status
// [ ] "Payment card data is managed by Stripe and is not stored by Flashcards" text visible
//
// Account deletion (Story 2.6):
// [ ] "Delete account" button visible at bottom of privacy page
// [ ] Clicking "Delete account" → confirmation form appears explaining what will be deleted
// [ ] Confirm button disabled until "DELETE" typed exactly (case-sensitive)
// [ ] Typing "delete" (lowercase) → button remains disabled
// [ ] Typing "DELETE" → button becomes enabled
// [ ] Submitting with "DELETE" → account soft-deleted, session invalidated, redirected to /
// [ ] Attempting to log back in with deleted account credentials → ACCOUNT_DELETED error
// [ ] OAuth callback with deleted account → redirected to /account-deleted
