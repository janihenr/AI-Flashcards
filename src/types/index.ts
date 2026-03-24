// SINGLE SOURCE OF TRUTH for Result<T> and CardMode
// All DAL functions and Server Actions return Result<T>. Never throw across these boundaries.

export type Result<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string; code?: string } }

export type CardMode = 'qa' | 'image' | 'context-narrative'

// User subscription tier — mirrors the text values stored in profiles.tier
export type ProfileTier = 'anonymous' | 'free' | 'pro' | 'team_member' | 'team_admin'
// qa:                front = question text, back = answer text
// image:             front = image (imageUrl required), back = label/explanation
// context-narrative: front = scenario/story framing, back = answer/resolution
