// PII Guard: NEVER log user-supplied text content (deck titles, card content, AI prompts).
// Allowed fields: userId, role, tier, action, errorCode, timestamp, requestId, durationMs.
// Violating this breaks GDPR compliance.

interface LogEntry {
  action: string // dot-notation: 'ai.generate.deck', 'stripe.webhook.received'
  userId?: string
  role?: string
  timestamp: string
  durationMs?: number
  error?: string | Error
  stack?: string
  [key: string]: unknown
}

export function log(entry: LogEntry) {
  const serialized = { ...entry, timestamp: new Date().toISOString() }
  // Coerce Error objects — plain JSON.stringify produces {}
  if (serialized.error instanceof Error) {
    const err = serialized.error
    serialized.error = err.message
    if (!serialized.stack) serialized.stack = err.stack
  }
  console.log(JSON.stringify(serialized))
}
