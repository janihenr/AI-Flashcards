import { z } from 'zod'

export const signupSchema = z.object({
  // z.email() is the Zod v4 top-level API (z.string().email() is deprecated in v4)
  email: z.email({ error: 'Please enter a valid email' }),
  password: z.string().min(8, { error: 'Password must be at least 8 characters' }),
  // z.boolean() + refine: inferred type is `boolean`, allows `false` as default with no type casts
  tosAccepted: z.boolean().refine(v => v === true, {
    message: 'You must accept the Terms of Service to continue',
  }),
})

// Used in Server Action: validates email + password only
// (tosAccepted is checked separately via if-guard for an explicit GDPR error code)
export const signupEmailSchema = signupSchema.omit({ tosAccepted: true })

export type SignupInput = z.infer<typeof signupSchema>
