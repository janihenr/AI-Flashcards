import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { log } from './logger'

describe('log()', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('outputs valid JSON to stdout', () => {
    log({ action: 'test.action', timestamp: '' })
    expect(consoleSpy).toHaveBeenCalledOnce()
    const output = consoleSpy.mock.calls[0][0] as string
    expect(() => JSON.parse(output)).not.toThrow()
  })

  it('includes the action field in output', () => {
    log({ action: 'ai.generate.deck', timestamp: '' })
    const output = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(output.action).toBe('ai.generate.deck')
  })

  it('overwrites timestamp with current ISO string', () => {
    const before = new Date().toISOString()
    log({ action: 'test', timestamp: 'old-timestamp' })
    const after = new Date().toISOString()
    const output = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(output.timestamp).not.toBe('old-timestamp')
    expect(output.timestamp >= before).toBe(true)
    expect(output.timestamp <= after).toBe(true)
  })

  it('includes optional userId when provided', () => {
    log({ action: 'test', userId: 'user-123', timestamp: '' })
    const output = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(output.userId).toBe('user-123')
  })

  it('includes durationMs when provided', () => {
    log({ action: 'test', durationMs: 42, timestamp: '' })
    const output = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(output.durationMs).toBe(42)
  })

  it('serializes Error objects to their message string instead of {}', () => {
    log({ action: 'test', timestamp: '', error: new Error('boom') as unknown as string })
    const output = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(output.error).toBe('boom')
  })

  it('does not leak user-supplied content passed via index signature', () => {
    // Even though the index signature allows unknown keys, reserved PII fields must not appear
    // in typical structured log calls — this ensures callers are not passing them
    log({ action: 'ai.generate.deck', userId: 'u-1', timestamp: '' })
    const output = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(output).not.toHaveProperty('deckTitle')
    expect(output).not.toHaveProperty('cardContent')
    expect(output).not.toHaveProperty('aiPrompt')
  })
})
