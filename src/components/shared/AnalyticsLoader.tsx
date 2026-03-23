'use client'
import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { useCookieConsentStore } from '@/stores/cookie-consent'

export function AnalyticsLoader() {
  const [ready, setReady] = useState(false)
  const analytics = useCookieConsentStore((s) => s.analytics)
  const consentGiven = useCookieConsentStore((s) => s.consentGiven)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard: setReady(true) on mount is the standard pattern to prevent SSR/CSR mismatch
  useEffect(() => { setReady(true) }, [])

  // Hydration guard: never render analytics before client-side store is confirmed
  if (!ready || !consentGiven || !analytics) return null
  return <Analytics />
}
