import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const STORAGE_KEY = 'cookie-consent'

// Helper: clear consent from localStorage
async function clearConsent(page: Page) {
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
}

test.describe('Cookie Consent Banner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearConsent(page)
    await page.reload()
  })

  test('AC1: banner appears for new visitor with no stored consent', async ({ page }) => {
    const banner = page.getByRole('dialog', { name: /cookie consent/i })
    await expect(banner).toBeVisible()
    await expect(page.getByRole('button', { name: /accept all/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /decline all/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /customize/i })).toBeVisible()
  })

  test('AC2: Accept All — banner dismisses, analytics: true stored', async ({ page }) => {
    await page.getByRole('button', { name: /accept all/i }).click()
    // Banner should disappear
    await expect(page.getByRole('dialog', { name: /cookie consent/i })).not.toBeVisible()
    // Check localStorage
    const stored = await page.evaluate((key) => {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    }, STORAGE_KEY)
    expect(stored?.state?.analytics).toBe(true)
    expect(stored?.state?.consentGiven).toBe(true)
  })

  test('AC3: Decline All — banner dismisses, analytics: false stored', async ({ page }) => {
    await page.getByRole('button', { name: /decline all/i }).click()
    await expect(page.getByRole('dialog', { name: /cookie consent/i })).not.toBeVisible()
    const stored = await page.evaluate((key) => {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    }, STORAGE_KEY)
    expect(stored?.state?.analytics).toBe(false)
    expect(stored?.state?.consentGiven).toBe(true)
  })

  test('AC4: Returning visitor with valid consent — no banner shown', async ({ page }) => {
    // Set valid consent in localStorage before loading
    const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: STORAGE_KEY,
      value: JSON.stringify({ state: { analytics: true, consentGiven: true, expiresAt }, version: 0 }),
    })
    await page.reload()
    await expect(page.getByRole('dialog', { name: /cookie consent/i })).not.toBeVisible()
  })

  test('AC4: Expired consent — banner re-appears', async ({ page }) => {
    // Set expired consent
    const expiresAt = Date.now() - 1000 // 1 second in the past
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: STORAGE_KEY,
      value: JSON.stringify({ state: { analytics: true, consentGiven: true, expiresAt }, version: 0 }),
    })
    await page.reload()
    await expect(page.getByRole('dialog', { name: /cookie consent/i })).toBeVisible()
  })

  test('Customize view — shows preferences panel, save sets custom preferences', async ({ page }) => {
    await page.getByRole('button', { name: /customize/i }).click()
    await expect(page.getByRole('dialog', { name: /cookie preferences/i })).toBeVisible()
    // Analytics checkbox should be unchecked (no prior consent)
    const analyticsCheckbox = page.getByRole('checkbox', { name: /analytics cookies/i })
    await expect(analyticsCheckbox).not.toBeChecked()
    // Check analytics and save
    await analyticsCheckbox.check()
    await page.getByRole('button', { name: /save preferences/i }).click()
    // Banner should dismiss
    await expect(page.getByRole('dialog')).not.toBeVisible()
    const stored = await page.evaluate((key) => {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    }, STORAGE_KEY)
    expect(stored?.state?.analytics).toBe(true)
    expect(stored?.state?.consentGiven).toBe(true)
  })

  test('AC5: Keyboard navigation — Tab/Shift+Tab trapped in banner, Enter activates', async ({ page }) => {
    const banner = page.getByRole('dialog', { name: /cookie consent/i })
    await expect(banner).toBeVisible()

    const declineBtn = page.getByRole('button', { name: /decline all/i })
    const customizeBtn = page.getByRole('button', { name: /customize/i })
    const acceptBtn = page.getByRole('button', { name: /accept all/i })

    // Auto-focus should have landed on first button (Decline All)
    await expect(declineBtn).toBeFocused()

    // Tab forward through all 3 buttons and wrap back to first
    await page.keyboard.press('Tab')
    await expect(customizeBtn).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(acceptBtn).toBeFocused()
    await page.keyboard.press('Tab') // should wrap to first (Decline All)
    await expect(declineBtn).toBeFocused()

    // Shift+Tab from first button should wrap to last (Accept All)
    await page.keyboard.press('Shift+Tab')
    await expect(acceptBtn).toBeFocused()

    // Activate Accept All via Enter key — banner should dismiss
    await page.keyboard.press('Enter')
    await expect(banner).not.toBeVisible()

    // Verify consent was stored
    const stored = await page.evaluate((key) => {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    }, STORAGE_KEY)
    expect(stored?.state?.consentGiven).toBe(true)
  })

  test('AC5: Accessibility — axe scan passes on cookie consent banner', async ({ page }) => {
    const banner = page.getByRole('dialog', { name: /cookie consent/i })
    await expect(banner).toBeVisible()

    const results = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze()

    expect(results.violations).toEqual([])
  })
})
