'use client'
import { useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useStudySessionStore } from '@/stores/study-session'

export function AnonymousSessionInitializer() {
  const setSessionReady = useStudySessionStore((s) => s.setSessionReady)
  // useRef instead of module-level flag — scoped to this component instance.
  // Module-level flags survive unmount; if the user navigates away mid-signInAnonymously,
  // the promise callback that resets the flag never fires and future mounts can never init.
  const initStartedRef = useRef(false)

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
        setSessionReady(true)
        return
      }
      if (initStartedRef.current) return
      initStartedRef.current = true
      supabase.auth
        .signInAnonymously()
        .then(() => {
          initStartedRef.current = false
          setSessionReady(true)
        })
        .catch((err) => {
          console.error('[AnonymousSessionInitializer] signInAnonymously failed:', err)
          initStartedRef.current = false
        })
    })
  }, [setSessionReady])

  return null
}
