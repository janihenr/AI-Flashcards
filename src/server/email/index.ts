import { Resend } from 'resend'
import type { ReactElement } from 'react'

// Lazily instantiated — avoids a hard crash at module load if RESEND_API_KEY is absent (e.g. CI).
// Cached after first call so the client is not re-created per request.
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured')
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

/**
 * Sends a transactional email via Resend.
 * For non-auth emails only (team invites, receipts, etc.).
 * Auth emails (verification, password reset) are sent by Supabase via custom SMTP config.
 *
 * @param template - React Email component (no inline HTML strings)
 * @param to       - Recipient email address
 * @param subject  - Email subject line
 */
export async function sendEmail(
  template: ReactElement,
  to: string,
  subject: string
): Promise<{ error: string | null }> {
  const { error } = await getResend().emails.send({
    from: 'noreply@flashcards.app', // update after Resend domain verification
    to,
    subject,
    react: template,
  })
  return { error: error?.message ?? null }
}
