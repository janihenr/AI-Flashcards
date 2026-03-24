import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createUserClient } from '@/lib/supabase/user'
import AppNav from '@/components/shared/AppNav'

// App layout — all routes under (app) require authentication.
// Middleware refreshes the session token; this layout enforces the auth guard.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Middleware sets x-invoke-path so we can preserve the destination in the redirect.
    // This guard is defense-in-depth for routes the middleware doesn't enumerate.
    const headersList = await headers()
    const currentPath = headersList.get('x-invoke-path') ?? '/'
    redirect(`/login?redirectTo=${encodeURIComponent(currentPath)}`)
  }

  return (
    <>
      <AppNav />
      <main>{children}</main>
    </>
  )
}
