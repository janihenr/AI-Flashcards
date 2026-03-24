/**
 * Unit tests for card validators — no external dependencies required.
 */
import { describe, it, expect } from 'vitest'
import { addCardSchema, validateAddCardInput } from './card'

describe('addCardSchema — front', () => {
  it('accepts valid front and back', () => {
    const result = addCardSchema.safeParse({ front: 'What is 2+2?', back: '4' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.front).toBe('What is 2+2?')
      expect(result.data.back).toBe('4')
    }
  })

  it('trims leading and trailing whitespace from front', () => {
    const result = addCardSchema.safeParse({ front: '  Hello  ', back: 'World' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.front).toBe('Hello')
  })

  it('rejects empty front', () => {
    const result = addCardSchema.safeParse({ front: '', back: 'Answer' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Front is required')
  })

  it('rejects whitespace-only front after trim', () => {
    const result = addCardSchema.safeParse({ front: '   ', back: 'Answer' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Front is required')
  })

  it('rejects null front', () => {
    expect(addCardSchema.safeParse({ front: null, back: 'Answer' }).success).toBe(false)
  })

  it('rejects undefined front', () => {
    expect(addCardSchema.safeParse({ front: undefined, back: 'Answer' }).success).toBe(false)
  })

  it('accepts front of exactly 2000 characters (boundary)', () => {
    expect(addCardSchema.safeParse({ front: 'a'.repeat(2000), back: 'b' }).success).toBe(true)
  })

  it('rejects front of 2001 characters', () => {
    const result = addCardSchema.safeParse({ front: 'a'.repeat(2001), back: 'b' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Front must be 2000 characters or fewer')
  })
})

describe('addCardSchema — back', () => {
  it('rejects empty back', () => {
    const result = addCardSchema.safeParse({ front: 'Question', back: '' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Back is required')
  })

  it('rejects whitespace-only back after trim', () => {
    const result = addCardSchema.safeParse({ front: 'Question', back: '   ' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Back is required')
  })

  it('rejects null back', () => {
    expect(addCardSchema.safeParse({ front: 'Q', back: null }).success).toBe(false)
  })

  it('accepts back of exactly 2000 characters (boundary)', () => {
    expect(addCardSchema.safeParse({ front: 'a', back: 'b'.repeat(2000) }).success).toBe(true)
  })

  it('rejects back of 2001 characters', () => {
    const result = addCardSchema.safeParse({ front: 'a', back: 'b'.repeat(2001) })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Back must be 2000 characters or fewer')
  })

  it('trims back whitespace', () => {
    const result = addCardSchema.safeParse({ front: 'Q', back: '  Answer  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.back).toBe('Answer')
  })
})

describe('validateAddCardInput', () => {
  it('returns success=false for non-object input', () => {
    expect(validateAddCardInput(null).success).toBe(false)
    expect(validateAddCardInput('string').success).toBe(false)
    expect(validateAddCardInput(42).success).toBe(false)
  })

  it('returns typed parse result on valid input', () => {
    const result = validateAddCardInput({ front: 'Q', back: 'A' })
    expect(result.success).toBe(true)
  })
})
