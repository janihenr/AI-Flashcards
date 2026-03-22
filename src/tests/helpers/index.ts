// Shared test utilities — never duplicated per-file
// Integration test helpers will be added in Story 1.2+ (require Supabase)

import { expect, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Run axe accessibility checks on the current page.
 * Checks for WCAG 2.1 AA violations. Call this in every core-flow E2E test.
 *
 * @example
 * await checkA11y(page)
 */
export async function checkA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
}
