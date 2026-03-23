import { describe, it, expect } from 'vitest'
import { signupSchema, signupEmailSchema } from './auth'

describe('signupSchema', () => {
  describe('email', () => {
    it('accepts a valid email', () => {
      const result = signupSchema.safeParse({ email: 'user@example.com', password: 'ValidPass1', tosAccepted: true })
      expect(result.success).toBe(true)
    })

    it('rejects an invalid email format', () => {
      const result = signupSchema.safeParse({ email: 'not-an-email', password: 'ValidPass1', tosAccepted: true })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/valid email/i)
      }
    })

    it('rejects an empty email', () => {
      const result = signupSchema.safeParse({ email: '', password: 'ValidPass1', tosAccepted: true })
      expect(result.success).toBe(false)
    })
  })

  describe('password', () => {
    it('accepts a password of exactly 8 characters', () => {
      const result = signupSchema.safeParse({ email: 'a@b.com', password: '12345678', tosAccepted: true })
      expect(result.success).toBe(true)
    })

    it('rejects a password shorter than 8 characters', () => {
      const result = signupSchema.safeParse({ email: 'a@b.com', password: 'short', tosAccepted: true })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/8 characters/i)
      }
    })

    it('rejects an empty password', () => {
      const result = signupSchema.safeParse({ email: 'a@b.com', password: '', tosAccepted: true })
      expect(result.success).toBe(false)
    })
  })

  describe('tosAccepted', () => {
    it('accepts true', () => {
      const result = signupSchema.safeParse({ email: 'a@b.com', password: '12345678', tosAccepted: true })
      expect(result.success).toBe(true)
    })

    it('rejects false', () => {
      const result = signupSchema.safeParse({ email: 'a@b.com', password: '12345678', tosAccepted: false })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/terms of service/i)
      }
    })

    it('rejects undefined', () => {
      const result = signupSchema.safeParse({ email: 'a@b.com', password: '12345678', tosAccepted: undefined })
      expect(result.success).toBe(false)
    })
  })
})

describe('signupEmailSchema', () => {
  it('validates email + password without requiring tosAccepted', () => {
    const result = signupEmailSchema.safeParse({ email: 'a@b.com', password: '12345678' })
    expect(result.success).toBe(true)
  })

  it('rejects short password', () => {
    const result = signupEmailSchema.safeParse({ email: 'a@b.com', password: 'short' })
    expect(result.success).toBe(false)
  })

  it('does not include tosAccepted in output', () => {
    const result = signupEmailSchema.safeParse({ email: 'a@b.com', password: '12345678' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect('tosAccepted' in result.data).toBe(false)
    }
  })
})
