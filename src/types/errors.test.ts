import { describe, it, expect } from 'vitest'
import { ErrorCodes } from './errors'
import type { ErrorCode } from './errors'

describe('ErrorCodes', () => {
  it('has RATE_LIMIT_EXCEEDED', () => {
    expect(ErrorCodes.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('has AI_UNAVAILABLE', () => {
    expect(ErrorCodes.AI_UNAVAILABLE).toBe('AI_UNAVAILABLE')
  })

  it('has CONTENT_POLICY_VIOLATION', () => {
    expect(ErrorCodes.CONTENT_POLICY_VIOLATION).toBe('CONTENT_POLICY_VIOLATION')
  })

  it('has UNAUTHORIZED', () => {
    expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED')
  })

  it('has NOT_FOUND', () => {
    expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND')
  })

  it('has STRIPE_WEBHOOK_DUPLICATE', () => {
    expect(ErrorCodes.STRIPE_WEBHOOK_DUPLICATE).toBe('STRIPE_WEBHOOK_DUPLICATE')
  })

  it('has exactly 6 error codes', () => {
    expect(Object.keys(ErrorCodes)).toHaveLength(6)
  })

  it('all values equal their keys (self-referential registry)', () => {
    for (const [key, value] of Object.entries(ErrorCodes)) {
      expect(value).toBe(key)
    }
  })

  it('ErrorCode union type is assignable from ErrorCodes values', () => {
    // Type-level test — if this compiles, the type is correct
    const code: ErrorCode = ErrorCodes.UNAUTHORIZED
    expect(code).toBe('UNAUTHORIZED')
  })
})
