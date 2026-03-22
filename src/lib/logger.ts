// PII Guard: NEVER log user-supplied text content (deck titles, card content, AI prompts).
// Allowed fields: userId, role, tier, action, errorCode, timestamp, requestId, durationMs.
// Violating this breaks GDPR compliance.

interface LogEntry {
  action: string // dot-notation: 'ai.generate.deck', 'stripe.webhook.received'
  userId?: string
  role?: string
  timestamp: string
  durationMs?: number
  error?: string
  stack?: string
  [key: string]: unknown
}

export function log(entry: LogEntry) {
  console.log(JSON.stringify({ ...entry, timestamp: new Date().toISOString() }))
}
