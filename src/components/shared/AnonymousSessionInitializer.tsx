'use client'
import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useStudySessionStore } from '@/stores/study-session'

// Module-level flag prevents concurrent double sign-in (React StrictMode or rapid re-mounts)
// Flag guards only the signInAnonymously call — getUser() is always checked first so existing
// sessions (e.g., user navigates away and back) are detected without needing to re-init.
let anonInitStarted = false

export function AnonymousSessionInitializer() {
  const setSessionReady = useStudySessionStore((s) => s.setSessionReady)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) {
      console.error('[AnonymousSessionInitializer] Missing Supabase env vars')
      return
    }

    const supabase = createBrowserClient(url, key)

    // Always call getUser() first — if user already exists (prior nav or restored session), skip init
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Session already exists — mark ready immediately
        setSessionReady(true)
        return
      }
      // No session — guard here (not at top of effect) to still detect existing sessions on re-entry
      if (anonInitStarted) return
      anonInitStarted = true
      supabase.auth
        .signInAnonymously()
        .then(() => {
          anonInitStarted = false // reset so re-mounts after session loss can retry
          setSessionReady(true)
        })
        .catch((err) => {
          console.error('[AnonymousSessionInitializer] signInAnonymously failed:', err)
          anonInitStarted = false // allow retry on next mount
        })
    })
  }, [setSessionReady])

  return null
}
