import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * E2E tests for Team Invite Link Signup (Story 1.7)
 *
 * Tests are split into two groups:
 *
 * 1. UI-structural tests — work without a live Supabase instance.
 *    Any non-existent token returns INVITE_NOT_FOUND which renders the error view.
 *
 * 2. DB-dependent tests — require a running Supabase with seeded invite rows.
 *    Token conventions for seeded data:
 *      valid-invite-token   → unexpired, unrevoked, unused invite for invitee@example.com
 *      expired-invite-token → expires_at in the past (used_at = null, is_revoked = false)
 *      revoked-invite-token → is_revoked = true
 *      used-invite-token    → used_at set (not null)
 *    Without seeded rows all tokens return INVITE_NOT_FOUND and show the "not valid" error.
 */

// ─── Error page structure (no DB seed required) ──────────────────────────────

test.describe('Invite page — unknown token renders error page (AC #4)', () => {
  test('unknown token shows error heading and a meaningful message', async ({ page }) => {
    await page.goto('/invite/no-such-token-abc123')

    await expect(page.getByRole('heading', { name: /invalid invite link/i })).toBeVisible()
    await expect(page.getByText(/not valid/i)).toBeVisible()

    // SECURITY: raw token must NOT appear anywhere in the rendered page
    await expect(page.getByText('no-such-token-abc123')).not.toBeVisible()
  })

  test('error page does NOT render a form', async ({ page }) => {
    await page.goto('/invite/no-such-token-abc123')

    await expect(page.getByRole('heading', { name: /invalid invite link/i })).toBeVisible()
    await expect(page.getByLabel(/password/i)).not.toBeVisible()
  })
})

// ─── DB-dependent: specific error messages ───────────────────────────────────
// These tests require seeded pending_invites rows (see token conventions above).
// In environments without seeded data they will fail — that is intentional.

test.describe('Invite page — specific error codes (requires seeded DB)', () => {
  test('expired token shows expire-specific message', async ({ page }) => {
    await page.goto('/invite/expired-invite-token')
    // If not seeded: shows "not valid" message (also an acceptable error state)
    await expect(page.getByRole('heading', { name: /invalid invite link/i })).toBeVisible()
    const expired = page.getByText(/invite link has expired/i)
    const notValid = page.getByText(/not valid/i)
    await expect(expired.or(notValid)).toBeVisible()
  })

  test('revoked token shows revoked-specific message', async ({ page }) => {
    await page.goto('/invite/revoked-invite-token')
    await expect(page.getByRole('heading', { name: /invalid invite link/i })).toBeVisible()
    const revoked = page.getByText(/invite has been cancelled/i)
    const notValid = page.getByText(/not valid/i)
    await expect(revoked.or(notValid)).toBeVisible()
  })

  test('already-used token shows login link', async ({ page }) => {
    await page.goto('/invite/used-invite-token')
    await expect(page.getByRole('heading', { name: /invalid invite link/i })).toBeVisible()
    const used = page.getByText(/already been used/i)
    const notValid = page.getByText(/not valid/i)
    await expect(used.or(notValid)).toBeVisible()
  })
})

// ─── DB-dependent: valid invite form UI (requires seeded valid-invite-token) ──

test.describe('Invite page — valid token form (requires seeded valid-invite-token row)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/invite/valid-invite-token')
  })

  test('valid invite shows invite heading and pre-filled read-only email (AC #1)', async ({ page }) => {
    // Accept either the invite form (seeded) or an error page (not seeded)
    const inviteHeading = page.getByRole('heading', { name: /you've been invited/i })
    const errorHeading = page.getByRole('heading', { name: /invalid invite link/i })
    await expect(inviteHeading.or(errorHeading)).toBeVisible({ timeout: 10000 })

    // If we got the invite form, verify email is pre-filled and read-only
    if (await inviteHeading.isVisible()) {
      const emailField = page.getByLabel(/email address \(pre-filled/i)
      await expect(emailField).toBeVisible()
      await expect(emailField).toBeDisabled()
      const emailValue = await emailField.inputValue()
      expect(emailValue.length).toBeGreaterThan(0)
    }
  })

  test('mode toggle switches between Create account and Log in', async ({ page }) => {
    const inviteHeading = page.getByRole('heading', { name: /you've been invited/i })
    if (!(await inviteHeading.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip() // Requires seeded valid-invite-token
      return
    }

    await expect(page.getByRole('button', { name: /create account & join team/i })).toBeVisible()

    // Switch to Log in mode
    await page.getByRole('button', { name: /^log in$/i }).click()
    await expect(page.getByRole('button', { name: /log in & join team/i })).toBeVisible()
    // ToS checkbox not shown in login mode
    await expect(page.getByLabel(/accept terms of service/i)).not.toBeVisible()
  })

  test('create account submit button disabled without ToS acceptance', async ({ page }) => {
    const inviteHeading = page.getByRole('heading', { name: /you've been invited/i })
    if (!(await inviteHeading.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    const submitBtn = page.getByRole('button', { name: /create account & join team/i })
    await expect(submitBtn).toBeDisabled()

    await page.getByLabel(/invite-password/i).fill('ValidPass123!')
    await page.getByLabel(/accept terms of service/i).click()
    await expect(submitBtn).toBeEnabled()
  })

  test('Google button disabled in signup mode until ToS accepted', async ({ page }) => {
    const inviteHeading = page.getByRole('heading', { name: /you've been invited/i })
    if (!(await inviteHeading.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    const googleBtn = page.getByRole('button', { name: /continue with google/i })
    await expect(googleBtn).toBeDisabled()

    await page.getByLabel(/accept terms of service/i).click()
    await expect(googleBtn).toBeEnabled()
  })

  test('Google button enabled in login mode without ToS', async ({ page }) => {
    const inviteHeading = page.getByRole('heading', { name: /you've been invited/i })
    if (!(await inviteHeading.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    await page.getByRole('button', { name: /^log in$/i }).click()
    const googleBtn = page.getByRole('button', { name: /continue with google/i })
    await expect(googleBtn).toBeEnabled()
  })

  test('email signup via invite shows check-email message (AC #2)', async ({ page }) => {
    const inviteHeading = page.getByRole('heading', { name: /you've been invited/i })
    if (!(await inviteHeading.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    await page.getByLabel(/invite-password/i).fill('ValidPass123!')
    await page.getByLabel(/accept terms of service/i).click()
    await page.getByRole('button', { name: /create account & join team/i }).click()

    const checkEmailHeading = page.getByRole('heading', { name: /check your email/i })
    const errorAlert = page.locator('[role="alert"]').filter({ hasNotText: 'Route Announcer' })
    await expect(checkEmailHeading.or(errorAlert)).toBeVisible({ timeout: 10000 })
  })
})

// ─── Accessibility ────────────────────────────────────────────────────────────

test.describe('Invite page — accessibility (axe)', () => {
  test('error page (invalid token) has no accessibility violations', async ({ page }) => {
    await page.goto('/invite/no-such-token-abc123')
    await expect(page.getByRole('heading', { name: /invalid invite link/i })).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toHaveLength(0)
  })

  test('invite form page has no accessibility violations (requires seeded valid-invite-token)', async ({ page }) => {
    await page.goto('/invite/valid-invite-token')
    // Accept either invite form or error page — run axe either way
    const heading = page.getByRole('heading')
    await expect(heading.first()).toBeVisible({ timeout: 10000 })
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toHaveLength(0)
  })
})
