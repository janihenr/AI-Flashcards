import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// ─── Auth guard ────────────────────────────────────────────────────────────────

test.describe('Security settings — auth guard', () => {
  test('unauthenticated user visiting /settings/security is redirected to /login', async ({ page }) => {
    await page.goto('/settings/security')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirect preserves redirectTo query param', async ({ page }) => {
    await page.goto('/settings/security')
    await expect(page).toHaveURL(/redirectTo=%2Fsettings%2Fsecurity/)
  })
})

// ─── Login page accessibility baseline for settings redirect ──────────────────

test.describe('Security settings — login redirect has no accessibility violations', () => {
  test('login page (redirect target) has no accessibility violations', async ({ page }) => {
    await page.goto('/settings/security')
    await expect(page).toHaveURL(/\/login/)
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toHaveLength(0)
  })
})

// ─── Manual verification required (needs live authenticated session) ──────────
//
// The following flows require a real Supabase session. Verify manually:
//
// Password change (Story 2.2):
// [ ] Security settings page renders /settings/security with "Change password" section
// [ ] Empty current-password field → inline error on that field before server call
// [ ] New password < 8 chars → inline error before server call
// [ ] Confirm password mismatch → inline error before server call
// [ ] Correct current password + valid new password → success message shown
// [ ] Wrong current password → "Current password is incorrect" error on that field
// [ ] After success: form replaced with confirmation (no re-submit possible)
// [ ] Google OAuth account: password section replaced with "uses Google sign-in" message
// [ ] Accessibility: /settings/security has no axe violations (authenticated)
//
// Active sessions (Story 2.3):
// [ ] Sessions section renders below password section
// [ ] Current session is labeled "Current session" badge
// [ ] Each session shows device/browser hint and "last active" timestamp
// [ ] Revoke button absent on current session; present on others
// [ ] Clicking Revoke → confirm dialog → session removed from list
// [ ] "Revoke all other sessions" button visible when non-current sessions exist
// [ ] Revoke all → all non-current sessions removed from list
// [ ] Multi-session: open second browser tab → revoke from first tab → second tab
//     loses auth within JWT TTL (~1 hour)
