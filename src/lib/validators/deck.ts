import { z } from 'zod'

export const createDeckSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: 'Title is required' })
    .max(100, { error: 'Title must be 100 characters or fewer' }),
  subject: z
    .string()
    .trim()
    .max(100, { error: 'Subject must be 100 characters or fewer' })
    .optional(),
})

export type CreateDeckInput = z.infer<typeof createDeckSchema>

export function validateCreateDeckInput(
  value: unknown
): ReturnType<typeof createDeckSchema.safeParse> {
  return createDeckSchema.safeParse(value)
}
