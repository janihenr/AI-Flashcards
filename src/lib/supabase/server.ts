// SERVICE ROLE CLIENT — admin operations only
// NEVER import this in client components, user-facing Server Actions, or DAL queries
// Only used in: Edge Functions, migrations, seed scripts, admin-only routes
import { createClient } from '@supabase/supabase-js'

export function createServerAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}
