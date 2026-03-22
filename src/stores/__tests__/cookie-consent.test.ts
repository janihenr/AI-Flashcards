// NOTE: Vitest runs in 'node' environment — localStorage is unavailable; persist middleware
// falls back to null storage (no-op). State is in-memory only. Persistence is covered by E2E tests.

import { describe, it, expect, beforeEach } from 'vitest'
import { useCookieConsentStore } from '../cookie-consent'

// Reset store state before each test
beforeEach(() => {
  useCookieConsentStore.setState({
    analytics: false,
    consentGiven: false,
    expiresAt: null,
  })
})

describe('useCookieConsentStore', () => {
  describe('acceptAll()', () => {
    it('sets analytics: true, consentGiven: true, and expiresAt ~12 months from now', () => {
      const before = Date.now()
      useCookieConsentStore.getState().acceptAll()
      const state = useCookieConsentStore.getState()

      expect(state.analytics).toBe(true)
      expect(state.consentGiven).toBe(true)
      expect(state.expiresAt).not.toBeNull()
      const twelveMonthsMs = 365 * 24 * 60 * 60 * 1000
      expect(state.expiresAt!).toBeGreaterThanOrEqual(before + twelveMonthsMs - 1000)
      expect(state.expiresAt!).toBeLessThanOrEqual(Date.now() + twelveMonthsMs + 1000)
    })
  })

  describe('declineAll()', () => {
    it('sets analytics: false, consentGiven: true, and a future expiresAt', () => {
      useCookieConsentStore.getState().declineAll()
      const state = useCookieConsentStore.getState()

      expect(state.analytics).toBe(false)
      expect(state.consentGiven).toBe(true)
      expect(state.expiresAt).not.toBeNull()
      expect(state.expiresAt!).toBeGreaterThan(Date.now())
    })
  })

  describe('hasValidConsent()', () => {
    it('returns false when consentGiven is false (initial state)', () => {
      expect(useCookieConsentStore.getState().hasValidConsent()).toBe(false)
    })

    it('returns false when expiresAt is in the past', () => {
      useCookieConsentStore.setState({
        analytics: true,
        consentGiven: true,
        expiresAt: Date.now() - 1000, // 1 second in the past
      })

      // hasValidConsent() returns false for expired consent.
      // NOTE: resetConsent() is NOT called here — expiry reset happens in
      // useCookieConsent hook's useEffect on mount (side effects in getters cause render loops).
      expect(useCookieConsentStore.getState().hasValidConsent()).toBe(false)
    })

    it('returns true when consentGiven is true and expiresAt is in the future', () => {
      useCookieConsentStore.setState({
        analytics: true,
        consentGiven: true,
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      })

      expect(useCookieConsentStore.getState().hasValidConsent()).toBe(true)
    })

    it('returns false when expiresAt is null', () => {
      useCookieConsentStore.setState({
        consentGiven: true,
        expiresAt: null,
      })

      expect(useCookieConsentStore.getState().hasValidConsent()).toBe(false)
    })
  })

  describe('resetConsent()', () => {
    it('resets all fields to default values', () => {
      useCookieConsentStore.getState().acceptAll()
      useCookieConsentStore.getState().resetConsent()
      const state = useCookieConsentStore.getState()

      expect(state.analytics).toBe(false)
      expect(state.consentGiven).toBe(false)
      expect(state.expiresAt).toBeNull()
    })
  })

  describe('setAnalytics()', () => {
    it('sets analytics to the provided value, marks consent given, and sets expiry', () => {
      useCookieConsentStore.getState().setAnalytics(true)
      const state = useCookieConsentStore.getState()

      expect(state.analytics).toBe(true)
      expect(state.consentGiven).toBe(true)
      expect(state.expiresAt).toBeGreaterThan(Date.now())
    })

    it('can set analytics to false while still marking consent given', () => {
      useCookieConsentStore.getState().setAnalytics(false)
      const state = useCookieConsentStore.getState()

      expect(state.analytics).toBe(false)
      expect(state.consentGiven).toBe(true)
    })
  })
})
