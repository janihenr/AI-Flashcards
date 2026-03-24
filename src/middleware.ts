import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server'
import { authLimiter } from '@/lib/rate-limit'

export async function middleware(request: NextRequest, context: NextFetchEvent) {
  // Rate limit auth endpoints before hitting Supabase — avoids network round-trip on floods
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    // request.ip is the Vercel-trusted real IP; fall back to x-forwarded-for first value only
    const ip = (request as NextRequest & { ip?: string }).ip
      ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? 'anonymous'
    try {
      const { success, pending } = await authLimiter.limit(ip)
      context.waitUntil(pending)
      if (!success) {
        return NextResponse.json({ error: 'RATE_LIMIT_EXCEEDED' }, { status: 429 })
      }
    } catch {
      // Redis unavailable — fail open rather than blocking all auth requests
    }
  }

  // E5: pass only headers per current @supabase/ssr docs
  let supabaseResponse = NextResponse.next({ request: { headers: request.headers } })

  // Session refresh MUST run on every request — keeps Supabase session alive
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: use getUser() — validates with Supabase server
  // NEVER use getSession() — reads cookie without server validation (security risk)
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from protected routes, preserving the
  // destination so the login page can redirect back after successful auth.
  const pathname = request.nextUrl.pathname
  const isProtectedRoute =
    pathname.startsWith('/decks') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/profile')

  if (!user && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url)
    // Include query string so post-login redirect preserves it (e.g. /decks?filter=starred)
    loginUrl.searchParams.set('redirectTo', pathname + (request.nextUrl.search ?? ''))
    return NextResponse.redirect(loginUrl)
  }

  // Pass current path to Server Components so the layout guard can preserve it in redirects
  supabaseResponse.headers.set('x-invoke-path', pathname + (request.nextUrl.search ?? ''))
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
