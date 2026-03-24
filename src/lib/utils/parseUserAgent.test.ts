import { describe, it, expect } from 'vitest'
import { parseUserAgentHint } from './parseUserAgent'

describe('parseUserAgentHint', () => {
  describe('null / empty inputs', () => {
    it('returns "Unknown device" for null', () => {
      expect(parseUserAgentHint(null)).toBe('Unknown device')
    })

    it('returns "Unknown device" for undefined', () => {
      expect(parseUserAgentHint(undefined)).toBe('Unknown device')
    })

    it('returns "Unknown device" for empty string', () => {
      expect(parseUserAgentHint('')).toBe('Unknown device')
    })
  })

  describe('browser detection', () => {
    it('detects Chrome on Windows', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      expect(parseUserAgentHint(ua)).toBe('Chrome on Windows')
    })

    it('detects Firefox on Windows', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
      expect(parseUserAgentHint(ua)).toBe('Firefox on Windows')
    })

    it('detects Safari on macOS', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
      expect(parseUserAgentHint(ua)).toBe('Safari on macOS')
    })

    it('detects Edge on Windows (not confused with Chrome)', () => {
      // Edge UA contains both "Chrome" and "Edg/" — Edge must win
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
      expect(parseUserAgentHint(ua)).toBe('Edge on Windows')
    })

    it('detects Chrome on macOS', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      expect(parseUserAgentHint(ua)).toBe('Chrome on macOS')
    })
  })

  describe('mobile OS detection', () => {
    it('detects Safari on iPhone (iPhone before macOS check)', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
      expect(parseUserAgentHint(ua)).toBe('Safari on iPhone')
    })

    it('detects Chrome on Android', () => {
      const ua =
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36'
      expect(parseUserAgentHint(ua)).toBe('Chrome on Android')
    })

    it('detects Safari on iPad (iPad before macOS, since iPadOS UA includes "macintosh")', () => {
      const ua =
        'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
      expect(parseUserAgentHint(ua)).toBe('Safari on iPad')
    })
  })

  describe('unknown / fallback', () => {
    it('returns browser name alone when OS is not recognized', () => {
      expect(parseUserAgentHint('curl/7.68.0')).toBe('Browser')
    })

    it('returns "Browser on Linux" for generic Linux UA', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0'
      expect(parseUserAgentHint(ua)).toBe('Firefox on Linux')
    })
  })
})
