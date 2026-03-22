// ANON KEY CLIENT — all regular app queries and user-facing Server Actions
// Uses HTTP-only cookies for session management (no localStorage)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createUserClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore cookie errors in RSC (read-only context)
            // Middleware handles session refresh; this is a no-op in RSC
          }
        },
      },
    }
  )
}
