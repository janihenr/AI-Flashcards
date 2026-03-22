'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const CONSENT_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000 // 12 months

interface ConsentState {
  analytics: boolean
  consentGiven: boolean
  expiresAt: number | null
  acceptAll: () => void
  declineAll: () => void
  setAnalytics: (value: boolean) => void
  hasValidConsent: () => boolean
  resetConsent: () => void
}

export const useCookieConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      analytics: false,
      consentGiven: false,
      expiresAt: null,

      acceptAll: () => set({
        analytics: true,
        consentGiven: true,
        expiresAt: Date.now() + CONSENT_EXPIRY_MS,
      }),

      declineAll: () => set({
        analytics: false,
        consentGiven: true,
        expiresAt: Date.now() + CONSENT_EXPIRY_MS,
      }),

      setAnalytics: (value: boolean) => set({
        analytics: value,
        consentGiven: true,
        expiresAt: Date.now() + CONSENT_EXPIRY_MS,
      }),

      hasValidConsent: () => {
        const { consentGiven, expiresAt } = get()
        if (!consentGiven || !expiresAt) return false
        // Guard: localStorage may deserialise numbers as strings in some environments
        const exp = typeof expiresAt === 'string' ? parseInt(expiresAt as string, 10) : expiresAt
        if (isNaN(exp)) return false
        return Date.now() <= exp
      },

      resetConsent: () => set({
        analytics: false,
        consentGiven: false,
        expiresAt: null,
      }),
    }),
    {
      name: 'cookie-consent',
      storage: createJSONStorage(() => {
        // Fallback for private browsing / Safari ITP where localStorage may be blocked
        try { return localStorage } catch { return { getItem: () => null, setItem: () => {}, removeItem: () => {} } }
      }),
      // Exclude function references — only persist data fields
      partialize: (state) => ({
        analytics: state.analytics,
        consentGiven: state.consentGiven,
        expiresAt: state.expiresAt,
      }),
    }
  )
)
