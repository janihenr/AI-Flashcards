'use client'
import { useState, useRef, useEffect } from 'react'
import { useCookieConsent } from '@/hooks/useCookieConsent'

export function CookieConsentBanner() {
  const { consent, hasValidConsent, acceptAll, declineAll, setAnalytics, isLoaded } = useCookieConsent()
  const [showCustomize, setShowCustomize] = useState(false)
  const [analyticsChecked, setAnalyticsChecked] = useState(consent.analytics)
  const bannerRef = useRef<HTMLDivElement>(null)

  // Auto-focus first button on mount and on view switch (WCAG 2.1 AA SC 2.1.2)
  useEffect(() => {
    if (!isLoaded) return
    const firstButton = bannerRef.current?.querySelector<HTMLElement>('button')
    firstButton?.focus()
  }, [showCustomize, isLoaded])

  // Focus trap: keep keyboard users inside the banner
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const focusable = Array.from(
      bannerRef.current?.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])') ?? []
    ).filter(el => !el.hasAttribute('disabled'))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }

  // Never render on SSR or if valid consent already exists
  if (!isLoaded || hasValidConsent()) return null

  if (showCustomize) {
    return (
      <div
        ref={bannerRef}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Cookie preferences"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-4 shadow-lg"
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Customize Cookie Preferences</h2>
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-3 cursor-not-allowed opacity-60">
              <input type="checkbox" checked disabled className="h-4 w-4" />
              <span className="text-sm text-gray-900">
                <strong>Functional cookies</strong> — Required for the app to work (always active)
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={analyticsChecked}
                onChange={(e) => setAnalyticsChecked(e.target.checked)}
                className="h-4 w-4 focus:ring-2 focus:ring-gray-900"
              />
              <span className="text-sm text-gray-900">
                <strong>Analytics cookies</strong> — Help us understand how you use the app
              </span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCustomize(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Back
            </button>
            <button
              onClick={() => { setAnalytics(analyticsChecked); setShowCustomize(false) }}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={bannerRef}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-4 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="flex-1 text-sm text-gray-900">
          We use cookies to improve your experience. Analytics cookies help us understand how you use the app.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={declineAll}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Decline All
          </button>
          <button
            onClick={() => { setAnalyticsChecked(consent.analytics); setShowCustomize(true) }}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Customize
          </button>
          <button
            onClick={acceptAll}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}
