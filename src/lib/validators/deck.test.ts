/**
 * Unit tests for deck validators — no external dependencies required.
 */
import { describe, it, expect } from 'vitest'
import { createDeckSchema, validateCreateDeckInput } from './deck'

describe('createDeckSchema — title', () => {
  it('accepts a valid title with subject', () => {
    const result = createDeckSchema.safeParse({ title: 'Spanish Vocab', subject: 'Languages' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Spanish Vocab')
      expect(result.data.subject).toBe('Languages')
    }
  })

  it('accepts a valid title without subject', () => {
    const result = createDeckSchema.safeParse({ title: 'Math Basics' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.subject).toBeUndefined()
  })

  it('rejects empty title', () => {
    const result = createDeckSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Title is required')
  })

  it('rejects whitespace-only title after trim', () => {
    const result = createDeckSchema.safeParse({ title: '   ' })
    expect(result.success).toBe(false)
  })

  it('trims leading and trailing whitespace from title', () => {
    const result = createDeckSchema.safeParse({ title: '  My Deck  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.title).toBe('My Deck')
  })

  it('accepts title of exactly 100 characters (boundary)', () => {
    expect(createDeckSchema.safeParse({ title: 'a'.repeat(100) }).success).toBe(true)
  })

  it('rejects title of 101 characters', () => {
    const result = createDeckSchema.safeParse({ title: 'a'.repeat(101) })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Title must be 100 characters or fewer')
  })

  it('rejects missing title (undefined)', () => {
    expect(createDeckSchema.safeParse({ title: undefined }).success).toBe(false)
  })
})

describe('createDeckSchema — subject', () => {
  it('accepts subject of exactly 100 characters (boundary)', () => {
    expect(createDeckSchema.safeParse({ title: 'My Deck', subject: 'a'.repeat(100) }).success).toBe(true)
  })

  it('rejects subject of 101 characters', () => {
    const result = createDeckSchema.safeParse({ title: 'My Deck', subject: 'a'.repeat(101) })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Subject must be 100 characters or fewer')
  })

  it('accepts subject as undefined (optional)', () => {
    const result = createDeckSchema.safeParse({ title: 'My Deck', subject: undefined })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.subject).toBeUndefined()
  })

  it('trims subject whitespace', () => {
    const result = createDeckSchema.safeParse({ title: 'My Deck', subject: '  Science  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.subject).toBe('Science')
  })

  it('empty string subject after trim becomes empty string (caller normalizes to undefined)', () => {
    // The Server Action normalizes empty string → undefined before calling validate.
    // If called directly with '', trim produces '' which passes optional (empty string is valid as optional).
    // This documents the behavior — callers should normalize upstream.
    const result = createDeckSchema.safeParse({ title: 'My Deck', subject: '' })
    expect(result.success).toBe(true)
  })
})

describe('validateCreateDeckInput', () => {
  it('returns success=false for non-object input', () => {
    expect(validateCreateDeckInput(null).success).toBe(false)
    expect(validateCreateDeckInput('string').success).toBe(false)
    expect(validateCreateDeckInput(42).success).toBe(false)
  })

  it('returns typed parse result on valid input', () => {
    const result = validateCreateDeckInput({ title: 'My Deck' })
    expect(result.success).toBe(true)
  })
})
