/**
 * Parses a raw User-Agent string into a short human-readable device/browser hint.
 * Returns "Unknown device" when the input is null, undefined, or empty.
 *
 * Intentionally simple — no external UA-parser library needed for the basic
 * "Chrome on Windows" / "Safari on iPhone" labels required by Story 2.3.
 */
export function parseUserAgentHint(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Unknown device'

  const ua = userAgent.toLowerCase()

  // Browser detection — order matters: Edge includes 'chrome', so check Edge first
  let browser = 'Browser'
  if (ua.includes('edg/') || ua.includes('edge/')) browser = 'Edge'
  else if (ua.includes('chrome')) browser = 'Chrome'
  else if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('safari')) browser = 'Safari'

  // OS detection — order matters: iPad/iPhone before general macintosh check
  let os = ''
  if (ua.includes('iphone')) os = 'iPhone'
  else if (ua.includes('ipad')) os = 'iPad'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS'
  else if (ua.includes('linux')) os = 'Linux'

  return os ? `${browser} on ${os}` : browser
}
