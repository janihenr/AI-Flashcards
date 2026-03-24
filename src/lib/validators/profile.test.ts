/**
 * Unit tests for profile validators — no external dependencies required.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { displayNameSchema, validateDisplayNameInput, validateAvatarUrl } from './profile'

describe('displayNameSchema', () => {
  it('accepts a valid name', () => {
    expect(displayNameSchema.safeParse('Jane Doe').success).toBe(true)
  })

  it('trims whitespace and returns trimmed value', () => {
    const result = displayNameSchema.safeParse('  Jane  ')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('Jane')
  })

  it('rejects empty string after trim', () => {
    expect(displayNameSchema.safeParse('   ').success).toBe(false)
  })

  it('rejects names longer than 50 characters', () => {
    expect(displayNameSchema.safeParse('a'.repeat(51)).success).toBe(false)
  })

  it('accepts exactly 50 characters', () => {
    expect(displayNameSchema.safeParse('a'.repeat(50)).success).toBe(true)
  })
})

describe('validateDisplayNameInput', () => {
  it('returns success=false for non-string input', () => {
    expect(validateDisplayNameInput(null).success).toBe(false)
    expect(validateDisplayNameInput(42).success).toBe(false)
  })
})

describe('validateAvatarUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcdef.supabase.co'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv
  })

  it('accepts a URL from the configured Supabase project avatars bucket', () => {
    const url = 'https://abcdef.supabase.co/storage/v1/object/public/avatars/uid/avatar.png'
    expect(validateAvatarUrl(url)).toBe(true)
  })

  it('rejects a URL from a different domain', () => {
    expect(validateAvatarUrl('https://evil.com/avatar.png')).toBe(false)
  })

  it('rejects a URL from a different Supabase project', () => {
    expect(validateAvatarUrl('https://xxxxxx.supabase.co/storage/v1/object/public/avatars/u/a.png')).toBe(false)
  })

  it('rejects a URL with correct hostname but wrong bucket path', () => {
    expect(validateAvatarUrl('https://abcdef.supabase.co/storage/v1/object/public/deck-images/u/img.png')).toBe(false)
  })

  it('rejects a URL with http instead of https', () => {
    expect(validateAvatarUrl('http://abcdef.supabase.co/storage/v1/object/public/avatars/u/a.png')).toBe(false)
  })

  it('rejects a malformed URL', () => {
    expect(validateAvatarUrl('not-a-url')).toBe(false)
  })

  it('rejects a URL containing .. path traversal', () => {
    const traversal = 'https://abcdef.supabase.co/storage/v1/object/public/avatars/../other/file'
    expect(validateAvatarUrl(traversal)).toBe(false)
  })

  it('rejects a URL containing percent-encoded traversal (%2e)', () => {
    const traversal = 'https://abcdef.supabase.co/storage/v1/object/public/avatars/%2e%2e/file'
    expect(validateAvatarUrl(traversal)).toBe(false)
  })

  it('rejects a URL containing uppercase percent-encoded traversal (%2E)', () => {
    const traversal = 'https://abcdef.supabase.co/storage/v1/object/public/avatars/%2E%2E/file'
    expect(validateAvatarUrl(traversal)).toBe(false)
  })

  it('rejects a URL with a query string appended', () => {
    const url = 'https://abcdef.supabase.co/storage/v1/object/public/avatars/u/a.png?injected=1'
    expect(validateAvatarUrl(url)).toBe(false)
  })

  it('rejects a URL with a fragment appended', () => {
    const url = 'https://abcdef.supabase.co/storage/v1/object/public/avatars/u/a.png#fragment'
    expect(validateAvatarUrl(url)).toBe(false)
  })

  it('accepts URL when expectedUserId matches the path segment', () => {
    const url = 'https://abcdef.supabase.co/storage/v1/object/public/avatars/user-123/avatar.png'
    expect(validateAvatarUrl(url, 'user-123')).toBe(true)
  })

  it('rejects URL when expectedUserId does not match the path segment', () => {
    const url = 'https://abcdef.supabase.co/storage/v1/object/public/avatars/other-user/avatar.png'
    expect(validateAvatarUrl(url, 'user-123')).toBe(false)
  })

  it('returns false when NEXT_PUBLIC_SUPABASE_URL is not set', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(validateAvatarUrl('https://abcdef.supabase.co/storage/v1/object/public/avatars/u/a.png')).toBe(false)
  })
})
