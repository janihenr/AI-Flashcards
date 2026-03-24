'use server'
import { createUserClient } from '@/lib/supabase/user'
import { revalidatePath } from 'next/cache'
import type { Result } from '@/types'

/**
 * Signs the user out server-side.
 *
 * Always clears cache and returns success — never leave the user stuck on a
 * "logging out" screen due to a transient signOut error. The session may
 * already be gone even if signOut returns an error.
 */
export async function logout(): Promise<Result<void>> {
  const supabase = await createUserClient()
  const { error } = await supabase.auth.signOut()

  revalidatePath('/', 'layout')

  if (error) {
    console.error('[logout] signOut error (non-fatal):', error.message)
  }

  // Always succeed from client's perspective — client MUST still redirect to /
  return { data: undefined, error: null }
}
