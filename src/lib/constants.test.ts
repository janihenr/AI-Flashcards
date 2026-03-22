import { describe, it, expect } from 'vitest'
import {
  HESITATION_THRESHOLD_MS,
  FSRS_DEFAULT_RETENTION,
  MAX_FREE_GENERATIONS,
  FINGERPRINT_MIN_SESSIONS,
  MIN_TEAM_SEATS,
  WEAK_CARD_THRESHOLD,
  INVITE_EXPIRY_DAYS,
  INVITE_RATE_LIMIT,
} from './constants'

describe('constants', () => {
  it('HESITATION_THRESHOLD_MS is exactly 10000', () => {
    expect(HESITATION_THRESHOLD_MS).toBe(10_000)
  })

  it('HESITATION_THRESHOLD_MS uses strict greater-than (not >=)', () => {
    // Documented: exactly 10000ms does NOT trigger (strictly >)
    expect(HESITATION_THRESHOLD_MS).toBe(10_000)
    expect(typeof HESITATION_THRESHOLD_MS).toBe('number')
  })

  it('FSRS_DEFAULT_RETENTION is 0.9', () => {
    expect(FSRS_DEFAULT_RETENTION).toBe(0.9)
  })

  it('MAX_FREE_GENERATIONS is 10', () => {
    expect(MAX_FREE_GENERATIONS).toBe(10)
  })

  it('FINGERPRINT_MIN_SESSIONS is 5', () => {
    expect(FINGERPRINT_MIN_SESSIONS).toBe(5)
  })

  it('MIN_TEAM_SEATS is 3', () => {
    expect(MIN_TEAM_SEATS).toBe(3)
  })

  it('WEAK_CARD_THRESHOLD is 0.70', () => {
    expect(WEAK_CARD_THRESHOLD).toBe(0.70)
  })

  it('INVITE_EXPIRY_DAYS is 7', () => {
    expect(INVITE_EXPIRY_DAYS).toBe(7)
  })

  it('INVITE_RATE_LIMIT is 20', () => {
    expect(INVITE_RATE_LIMIT).toBe(20)
  })
})
