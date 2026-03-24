'use server'

import { revalidatePath } from 'next/cache'
import { createUserClient } from '@/lib/supabase/user'
import { updateProfile } from '@/server/db/queries/users'
import { validateDisplayNameInput, validateAvatarUrl } from '@/lib/validators/profile'
import type { Result } from '@/types'

export async function updateDisplayName(formData: FormData): Promise<Result<void>> {
  const supabase = await createUserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
  }

  const raw = formData.get('displayName')
  const parsed = validateDisplayNameInput(raw)
  if (!parsed.success) {
    return { data: null, error: { message: parsed.error.issues[0]?.message ?? 'Invalid name', code: 'VALIDATION_ERROR' } }
  }

  const result = await updateProfile(user.id, { displayName: parsed.data })
  if (result.error) return result

  revalidatePath('/settings/profile')
  revalidatePath('/', 'layout')
  return { data: undefined, error: null }
}

export async function updateAvatarUrl(avatarUrl: string): Promise<Result<void>> {
  const supabase = await createUserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
  }

  if (!validateAvatarUrl(avatarUrl, user.id)) {
    return { data: null, error: { message: 'Invalid avatar URL', code: 'VALIDATION_ERROR' } }
  }

  const result = await updateProfile(user.id, { avatarUrl })
  if (result.error) return result

  revalidatePath('/settings/profile')
  revalidatePath('/', 'layout')
  return { data: undefined, error: null }
}
