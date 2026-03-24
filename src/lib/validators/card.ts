import { z } from 'zod'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

export const addCardSchema = z.object({
  front: z
    .string()
    .trim()
    .min(1, { error: 'Front is required' })
    .max(2000, { error: 'Front must be 2000 characters or fewer' }),
  back: z
    .string()
    .trim()
    .min(1, { error: 'Back is required' })
    .max(2000, { error: 'Back must be 2000 characters or fewer' }),
})

export type AddCardInput = z.infer<typeof addCardSchema>

export function validateAddCardInput(
  value: unknown
): ReturnType<typeof addCardSchema.safeParse> {
  return addCardSchema.safeParse(value)
}
