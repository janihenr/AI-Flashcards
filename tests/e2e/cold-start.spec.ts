import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Cold Start Deck Study', () => {
  test('anonymous visitor can load cold start page without login', async ({ page }) => {
    await page.goto('/cold-start')
    // Page should load without redirect to login
    await expect(page).toHaveURL(/\/cold-start/)
    // At least one flashcard should be visible
    await expect(page.locator('[style*="perspective"]').first()).toBeVisible()
  })

  test('first card renders in < 1 second (NFR-PERF4)', async ({ page }) => {
    // This NFR is only meaningful against a production build.
    // In dev mode, Next.js compilation and remote Supabase latency add 3–5 s of overhead.
    test.skip(!process.env.CI, 'NFR-PERF4 only enforced in CI against a production build')

    const start = Date.now()
    await page.goto('/cold-start')
    await expect(page.locator('[style*="perspective"]').first()).toBeVisible()
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(1000)
  })

  test('card flip interaction works — click to reveal back', async ({ page }) => {
    await page.goto('/cold-start')
    const card = page.locator('[style*="perspective"]').first()
    await expect(card).toBeVisible()

    // "Click to reveal" prompt should be visible before flip
    await expect(page.getByText('Click to reveal')).toBeVisible()

    // Click the card to flip it
    await card.click()

    // After flip, "Click to reveal" should be gone
    await expect(page.getByText('Click to reveal')).not.toBeVisible({ timeout: 2000 })
  })

  test('rating buttons appear after card is flipped', async ({ page }) => {
    await page.goto('/cold-start')
    const card = page.locator('[style*="perspective"]').first()
    await card.click()

    // Rating buttons should appear after flip
    await expect(page.getByRole('button', { name: /Again/i })).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: /Hard/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Good/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Easy/i })).toBeVisible()
  })

  test('all 10 cards can be progressed through and completion screen appears', async ({ page }) => {
    await page.goto('/cold-start')

    // Wait for StudyQueue to hydrate (session ready)
    // We click through all 10 cards
    for (let i = 0; i < 10; i++) {
      // Wait for a card to be present
      const card = page.locator('[style*="perspective"]').first()
      await expect(card).toBeVisible({ timeout: 5000 })

      // Flip it
      await card.click()

      // Wait for Good button to be enabled (session ready).
      // signInAnonymously against a remote Supabase can take 15–20 s in dev.
      const goodBtn = page.getByRole('button', { name: /Good/i })
      await expect(goodBtn).toBeEnabled({ timeout: 30000 })

      await goodBtn.click()

      // handleRate is async (awaits rateAnonymousCard before advancing).
      // Wait for the card to actually change before the next iteration:
      // - Cards 1–9: new unflipped card shows "Click to reveal"
      // - Card 10: Session Complete screen appears
      if (i < 9) {
        await expect(page.getByText('Click to reveal')).toBeVisible({ timeout: 30000 })
      }
    }

    // Completion screen should appear
    await expect(page.getByText('Session Complete!')).toBeVisible({ timeout: 30000 })
  })

  test('completion screen has signup CTA', async ({ page }) => {
    await page.goto('/cold-start')

    // Progress through all cards
    for (let i = 0; i < 10; i++) {
      const card = page.locator('[style*="perspective"]').first()
      await expect(card).toBeVisible({ timeout: 5000 })
      await card.click()

      // signInAnonymously against remote Supabase can take 15–20 s in dev
      const goodBtn = page.getByRole('button', { name: /Good/i })
      await expect(goodBtn).toBeEnabled({ timeout: 30000 })
      await goodBtn.click()

      // Wait for card to advance before next iteration (see note in previous test)
      if (i < 9) {
        await expect(page.getByText('Click to reveal')).toBeVisible({ timeout: 30000 })
      }
    }

    // CTA buttons should be present
    await expect(page.getByRole('link', { name: /sign up to save progress/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('link', { name: /explore more decks/i })).toBeVisible()
  })

  test('accessibility — axe scan passes on cold start page (ARCH16)', async ({ page }) => {
    await page.goto('/cold-start')
    // Wait for page to fully load
    await expect(page.locator('[style*="perspective"]').first()).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
