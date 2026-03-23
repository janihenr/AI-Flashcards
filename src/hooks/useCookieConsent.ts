'use client'
import { useEffect, useState } from 'react'
import { useCookieConsentStore } from '@/stores/cookie-consent'

export function useCookieConsent() {
  const [isLoaded, setIsLoaded] = useState(false)
  const store = useCookieConsentStore()

  // isLoaded = false on SSR and first render; true only after client hydration
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard: setIsLoaded(true) on mount is the standard pattern to prevent SSR/CSR mismatch
    setIsLoaded(true)
    const { consentGiven, expiresAt, resetConsent } = useCookieConsentStore.getState()
    // Check expiry on mount — reset if consent has expired (triggers banner re-appearance)
    if (consentGiven && expiresAt && Date.now() > expiresAt) {
      resetConsent()
      return
    }
    // Guard: reset if expiresAt is a corrupted NaN value (data integrity)
    if (consentGiven && expiresAt) {
      const exp = typeof expiresAt === 'string' ? parseInt(expiresAt as string, 10) : expiresAt
      if (isNaN(exp)) resetConsent()
    }
  }, [])

  return {
    consent: {
      analytics: store.analytics,
      consentGiven: store.consentGiven,
    },
    hasValidConsent: store.hasValidConsent,
    acceptAll: store.acceptAll,
    declineAll: store.declineAll,
    setAnalytics: store.setAnalytics,
    isLoaded,
  }
}
