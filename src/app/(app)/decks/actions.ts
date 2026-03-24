'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createUserClient } from '@/lib/supabase/user'
import { createDeck, getDeckById } from '@/server/db/queries/decks'
import { validateCreateDeckInput } from '@/lib/validators/deck'
import { validateAddCardInput, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/validators/card'
import { trackEvent } from '@/lib/analytics'
import { db } from '@/server/db'
import { notes, cards } from '@/server/db/schema'
import type { Result } from '@/types'

export async function createNewDeck(
  _prev: Result<void> | null,
  formData: FormData
): Promise<Result<void>> {
  const supabase = await createUserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
  }

  const raw = {
    title: formData.get('title'),
    // Normalize empty string AND whitespace-only → undefined so optional subject passes Zod validation
    subject: (formData.get('subject') as string | null)?.trim() || undefined,
  }

  const parsed = validateCreateDeckInput(raw)
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: parsed.error.issues[0]?.message ?? 'Invalid input',
        code: 'VALIDATION_ERROR',
      },
    }
  }

  const result = await createDeck(user.id, parsed.data)
  if (result.error) return result

  // FR58: fire-and-forget analytics — never block on tracking failure
  void trackEvent('deck_created', { deckId: result.data.id })

  // redirect() throws NEXT_REDIRECT — Next.js handles it; do not catch
  redirect(`/decks/${result.data.id}`)
}

export async function addCardToDeck(
  _prev: Result<{ id: string }> | null,
  formData: FormData
): Promise<Result<{ id: string }>> {
  const supabase = await createUserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
  }

  const deckId = formData.get('deckId')
  if (typeof deckId !== 'string' || !deckId) {
    return { data: null, error: { message: 'Invalid deck', code: 'NOT_FOUND' } }
  }

  // Ownership check — belt-and-suspenders; RSC page already checks but Server Action must too
  const deckResult = await getDeckById(deckId)
  if (deckResult.error || !deckResult.data) {
    return { data: null, error: { message: 'Deck not found', code: 'NOT_FOUND' } }
  }
  if (deckResult.data.userId !== user.id) {
    return { data: null, error: { message: 'Deck not found', code: 'NOT_FOUND' } }
  }

  const parsed = validateAddCardInput({
    front: formData.get('front'),
    back: formData.get('back'),
  })
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: parsed.error.issues[0]?.message ?? 'Invalid input',
        code: 'VALIDATION_ERROR',
      },
    }
  }

  const { front, back } = parsed.data

  // Handle optional image upload
  let imageUrl: string | null = null
  let uploadedStoragePath: string | null = null
  const imageFile = formData.get('image')
  if (imageFile instanceof File && imageFile.size > 0) {
    // Server-side re-validation (defend-in-depth; client already checked)
    if (!ACCEPTED_IMAGE_TYPES.includes(imageFile.type as typeof ACCEPTED_IMAGE_TYPES[number])) {
      return { data: null, error: { message: 'Invalid image type', code: 'VALIDATION_ERROR' } }
    }
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return { data: null, error: { message: 'Image must be 5 MB or smaller', code: 'VALIDATION_ERROR' } }
    }

    const rawName = imageFile.name || 'image'
    const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'image'
    uploadedStoragePath = `${user.id}/${deckId}/${Date.now()}-${safeName}`
    const { error: uploadError } = await supabase.storage
      .from('deck-images')
      .upload(uploadedStoragePath, imageFile, { contentType: imageFile.type, upsert: false })
    if (uploadError) {
      console.error('[addCardToDeck] storage upload error:', uploadError)
      return { data: null, error: { message: 'Image upload failed', code: 'STORAGE_ERROR' } }
    }
    // getPublicUrl is synchronous — no await needed
    const { data: urlData } = supabase.storage.from('deck-images').getPublicUrl(uploadedStoragePath)
    imageUrl = urlData.publicUrl
  }

  // DB transaction: create note then card — atomic, rolls back on any failure
  let cardId: string
  try {
    cardId = await db.transaction(async (tx) => {
      const [noteRow] = await tx
        .insert(notes)
        .values({ userId: user.id, deckId, content: front })
        .returning({ id: notes.id })
      if (!noteRow) throw new Error('note insert failed')

      const [cardRow] = await tx
        .insert(cards)
        .values({
          userId: user.id,
          noteId: noteRow.id,
          mode: imageUrl ? 'image' : 'qa',
          frontContent: front,
          backContent: back,
          imageUrl: imageUrl ?? null,
        })
        .returning({ id: cards.id })
      if (!cardRow) throw new Error('card insert failed')
      return cardRow.id
    })
  } catch (err) {
    console.error('[addCardToDeck] transaction error:', err)
    // Clean up orphaned image — transaction failed but upload already succeeded
    if (uploadedStoragePath) {
      supabase.storage.from('deck-images').remove([uploadedStoragePath]).catch((e) => {
        console.error('[addCardToDeck] orphan image cleanup failed:', e)
      })
    }
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }

  // fire-and-forget analytics — never block on tracking failure
  void trackEvent('card_added', { deckId, cardId })

  revalidatePath(`/decks/${deckId}`)
  return { data: { id: cardId }, error: null }
}
