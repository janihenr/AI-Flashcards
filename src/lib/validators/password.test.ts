/**
 * Unit tests for password validators — no external dependencies required.
 */
import { describe, it, expect } from 'vitest'
import { newPasswordSchema, validateNewPassword } from './password'

describe('newPasswordSchema', () => {
  it('accepts a password of exactly 8 characters', () => {
    expect(newPasswordSchema.safeParse('abcd1234').success).toBe(true)
  })

  it('accepts a password longer than 8 characters', () => {
    expect(newPasswordSchema.safeParse('supersecretpassword').success).toBe(true)
  })

  it('rejects a password of 7 characters', () => {
    const result = newPasswordSchema.safeParse('short12')
    expect(result.success).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(newPasswordSchema.safeParse('').success).toBe(false)
  })

  it('rejects a password of 1 character', () => {
    expect(newPasswordSchema.safeParse('a').success).toBe(false)
  })

  it('returns the error message when too short', () => {
    const result = newPasswordSchema.safeParse('short12')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Password must be at least 8 characters')
    }
  })
})

describe('validateNewPassword', () => {
  it('returns success=false for non-string input', () => {
    expect(validateNewPassword(null).success).toBe(false)
    expect(validateNewPassword(42).success).toBe(false)
    expect(validateNewPassword(undefined).success).toBe(false)
  })

  it('returns success=true for a valid password string', () => {
    expect(validateNewPassword('validpassword').success).toBe(true)
  })
})
