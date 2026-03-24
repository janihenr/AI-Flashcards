import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// ─── Auth guard ────────────────────────────────────────────────────────────────

test.describe('Profile settings — auth guard', () => {
  test('unauthenticated user visiting /settings/profile is redirected to /login', async ({ page }) => {
    await page.goto('/settings/profile')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirect preserves redirectTo query param', async ({ page }) => {
    await page.goto('/settings/profile')
    await expect(page).toHaveURL(/redirectTo=%2Fsettings%2Fprofile/)
  })
})

// ─── Login page accessibility baseline for settings redirect ──────────────────

test.describe('Profile settings — login redirect has no accessibility violations', () => {
  test('login page (redirect target) has no accessibility violations', async ({ page }) => {
    await page.goto('/settings/profile')
    await expect(page).toHaveURL(/\/login/)
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toHaveLength(0)
  })
})

// ─── Manual verification required (needs live authenticated session) ──────────
//
// The following flows require a real Supabase session and cannot be automated
// without a test user setup. Verify manually against the running app:
//
// [ ] Profile settings page renders at /settings/profile with display name input and avatar
// [ ] Display name update succeeds: change name → save → new name reflected in nav/header
// [ ] Display name validation: empty name → inline error shown before server call
// [ ] Display name validation: name > 50 chars → inline error shown before server call
// [ ] Avatar upload: select JPEG/PNG/WebP ≤ 2 MB → uploads and avatar updates
// [ ] Avatar validation: file > 2 MB → client-side error before upload attempt
// [ ] Avatar validation: wrong file type (e.g. .gif) → client-side error
// [ ] Accessibility: /settings/profile page has no axe violations (authenticated)
