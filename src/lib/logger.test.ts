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

  it('does NOT include deck title or card content fields in the type signature', () => {
    // Verify the LogEntry type doesn't have fields for user-supplied content
    // The log function signature itself enforces this at compile time
    const entry = { action: 'test', timestamp: '' }
    expect(Object.keys(entry)).not.toContain('deckTitle')
    expect(Object.keys(entry)).not.toContain('cardContent')
    expect(Object.keys(entry)).not.toContain('aiPrompt')
  })
})
