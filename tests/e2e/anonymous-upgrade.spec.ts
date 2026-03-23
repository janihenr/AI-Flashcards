import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * E2E tests for Story 1.6: Anonymous Session Upgrade to Registered Account
 *
 * Full OAuth round-trips and database operations require a live Supabase instance
 * and are covered by integration tests (tests/integration/anonymous-upgrade.test.ts).
 * These E2E tests validate the UI flows and AC#1 entry points.
 */

test.describe('Story 1.6 — Cold Start Upgrade CTA (AC#1)', () => {
  test('completion screen "Sign up to save progress" CTA links to /signup?upgrade=true', async ({ page }) => {
    await page.goto('/cold-start')

    // Progress through all 10 cards
    for (let i = 0; i < 10; i++) {
      const card = page.locator('[style*="perspective"]').first()
      await expect(card).toBeVisible({ timeout: 5000 })
      await card.click()

      const goodBtn = page.getByRole('button', { name: /Good/i })
      await expect(goodBtn).toBeEnabled({ timeout: 10000 })
      await goodBtn.click()
    }

    await expect(page.getByText('Session Complete!')).toBeVisible({ timeout: 5000 })

    const upgradeCta = page.getByRole('link', { name: /sign up to save progress/i })
    await expect(upgradeCta).toBeVisible()
    await expect(upgradeCta).toHaveAttribute('href', '/signup?upgrade=true')
  })

  test('completion screen "Explore more decks" link is present alongside upgrade CTA', async ({ page }) => {
    await page.goto('/cold-start')

    for (let i = 0; i < 10; i++) {
      const card = page.locator('[style*="perspective"]').first()
      await expect(card).toBeVisible({ timeout: 5000 })
      await card.click()
      const goodBtn = page.getByRole('button', { name: /Good/i })
      await expect(goodBtn).toBeEnabled({ timeout: 10000 })
      await goodBtn.click()
    }

    await expect(page.getByText('Session Complete!')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('link', { name: /explore more decks/i })).toBeVisible()
  })
})

test.describe('Story 1.6 — Signup Page Upgrade Mode (AC#1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup?upgrade=true')
  })

  test('shows upgrade context banner when ?upgrade=true is present', async ({ page }) => {
    await expect(
      page.getByText(/your study progress will be saved to your account/i)
    ).toBeVisible()
  })

  test('upgrade mode still shows the full signup form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByLabel(/terms of service/i)).toBeVisible()
  })

  test('upgrade mode: submit button is disabled until ToS checkbox is checked', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /create account/i })
    await expect(submitBtn).toBeDisabled()

    await page.getByLabel(/terms of service/i).click()
    await expect(submitBtn).toBeEnabled()
  })

  test('upgrade mode: Google button is disabled until ToS checkbox is checked', async ({ page }) => {
    const googleBtn = page.getByRole('button', { name: /sign up with google/i })
    await expect(googleBtn).toBeDisabled()

    await page.getByLabel(/terms of service/i).click()
    await expect(googleBtn).toBeEnabled()
  })

  test('upgrade mode: password shorter than 8 characters shows validation error without server call', async ({ page }) => {
    await page.getByLabel(/terms of service/i).click()
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('short')

    let serverCallMade = false
    page.on('request', (req) => {
      if (req.method() === 'POST') serverCallMade = true
    })

    await page.getByRole('button', { name: /create account/i }).click()

    await expect(page.getByText(/at least 8 characters/i)).toBeVisible()
    expect(serverCallMade).toBe(false)
  })

  test('upgrade mode: email signup shows check-email screen (or error if Supabase unavailable)', async ({ page }) => {
    await page.getByLabel(/terms of service/i).click()
    await page.getByLabel(/email/i).fill(`upgrade+${Date.now()}@example.com`)
    await page.getByLabel(/password/i).fill('ValidPass123!')
    await page.getByRole('button', { name: /create account/i }).click()

    const checkEmailMsg = page.getByRole('heading', { name: /check your email/i })
    const errorMsg = page.getByRole('alert')
    await expect(checkEmailMsg.or(errorMsg)).toBeVisible({ timeout: 10000 })
  })

  test('upgrade mode signup page has no accessibility violations (axe)', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toHaveLength(0)
  })
})

test.describe('Story 1.6 — Normal signup without upgrade mode', () => {
  test('normal signup page (/signup) does NOT show upgrade banner', async ({ page }) => {
    await page.goto('/signup')
    await expect(
      page.getByText(/your study progress will be saved to your account/i)
    ).not.toBeVisible()
  })
})
