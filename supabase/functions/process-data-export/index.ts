// Deno Edge Function — GDPR personal data export processor (Story 2.4)
// Triggered via HTTP POST from the Next.js Server Action after() callback.
// Generates a JSON export of all user personal data, uploads to private storage,
// and sends a download-ready email via Resend HTTP API.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // service role — bypasses RLS for cross-table reads
)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:3000'
const FROM_EMAIL = 'noreply@flashcards.app'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let jobId: string
  try {
    const body = await req.json()
    jobId = body?.jobId
    if (typeof jobId !== 'string' || !jobId) {
      return new Response('Missing jobId', { status: 400 })
    }
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  // Fetch job — return 200 if not found (idempotent)
  const { data: job, error: jobFetchError } = await supabase
    .from('data_export_jobs')
    .select('id, user_id, status')
    .eq('id', jobId)
    .single()

  if (jobFetchError || !job) {
    console.error('Job not found:', jobId, jobFetchError?.message)
    return new Response('Job not found', { status: 200 })
  }

  // Only process pending jobs — guard against double-processing
  if (job.status !== 'pending') {
    return new Response(`Job already ${job.status}`, { status: 200 })
  }

  const userId = job.user_id

  // Mark as processing — check for error to guard against double-processing
  const { error: processingError } = await supabase
    .from('data_export_jobs')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', jobId)

  if (processingError) {
    console.error(JSON.stringify({ action: 'gdpr.export.processing_update_failed', jobId, error: processingError.message }))
    return new Response('Failed to update job status', { status: 500 })
  }

  try {
    // Fetch user email for notifications
    const { data: authData } = await supabase.auth.admin.getUserById(userId)
    const userEmail = authData?.user?.email ?? null

    // ── Query all export data ──────────────────────────────────────────────

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, tier, gdpr_consent_at, created_at, format_preferences, user_fsrs_params, avatar_url')
      .eq('id', userId)
      .single()

    const { data: decks } = await supabase
      .from('decks')
      .select('id, title, subject, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    const { data: notes } = await supabase
      .from('notes')
      .select('id, deck_id, content, created_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    const { data: cards } = await supabase
      .from('cards')
      .select('id, note_id, mode, front_content, back_content, narrative_context, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, due, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, card_id, rating, presentation_mode, response_time_ms, reviewed_at')
      .eq('user_id', userId)
      .order('reviewed_at', { ascending: true })

    // ── Assemble nested export JSON ────────────────────────────────────────

    // Group notes and cards by deck_id for nested structure
    const notesByDeck = new Map<string, typeof notes>()
    for (const note of notes ?? []) {
      const bucket = notesByDeck.get(note.deck_id) ?? []
      bucket.push(note)
      notesByDeck.set(note.deck_id, bucket)
    }

    const cardsByNoteId = new Map<string, typeof cards>()
    for (const card of cards ?? []) {
      const bucket = cardsByNoteId.get(card.note_id) ?? []
      bucket.push(card)
      cardsByNoteId.set(card.note_id, bucket)
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      format: 'flashcards-gdpr-export-v1',
      profile: profile ? {
        id: profile.id,
        displayName: profile.display_name,
        tier: profile.tier,
        gdprConsentAt: profile.gdpr_consent_at,
        createdAt: profile.created_at,
        avatarUrl: profile.avatar_url ?? null,
        learningFingerprint: {
          formatPreferences: profile.format_preferences ?? null,
          userFsrsParams: profile.user_fsrs_params ?? null,
        },
      } : null,
      decks: (decks ?? []).map(deck => ({
        id: deck.id,
        title: deck.title,
        subject: deck.subject ?? null,
        createdAt: deck.created_at,
        notes: (notesByDeck.get(deck.id) ?? []).map(note => ({
          id: note.id,
          content: note.content,
          createdAt: note.created_at,
          cards: (cardsByNoteId.get(note.id) ?? []).map(card => ({
            id: card.id,
            noteId: card.note_id,
            mode: card.mode,
            frontContent: card.front_content,
            backContent: card.back_content,
            narrativeContext: card.narrative_context ?? null,
            fsrs: {
              stability: card.stability,
              difficulty: card.difficulty,
              elapsedDays: card.elapsed_days,
              scheduledDays: card.scheduled_days,
              reps: card.reps,
              lapses: card.lapses,
              state: card.state,
              due: card.due,
            },
            createdAt: card.created_at,
          })),
        })),
      })),
      reviews: (reviews ?? []).map(review => ({
        id: review.id,
        cardId: review.card_id,
        rating: review.rating,
        presentationMode: review.presentation_mode ?? null,
        responseTimeMs: review.response_time_ms ?? null,
        reviewedAt: review.reviewed_at,
      })),
    }

    // ── Upload to private storage ──────────────────────────────────────────

    const filePath = `${userId}/${jobId}.json`
    const jsonBytes = new TextEncoder().encode(JSON.stringify(exportData, null, 2))

    const { error: uploadError } = await supabase.storage
      .from('data-exports')
      .upload(filePath, jsonBytes, {
        contentType: 'application/json',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    // ── Update job to ready ────────────────────────────────────────────────

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    const { error: readyError } = await supabase
      .from('data_export_jobs')
      .update({
        status: 'ready',
        file_path: filePath,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    if (readyError) {
      throw new Error(`Failed to mark job ready: ${readyError.message}`)
    }

    // ── Send download-ready email via Resend HTTP API ──────────────────────
    // Wrapped in its own try/catch so an email failure does NOT flip the job back to 'failed'

    if (userEmail) {
      try {
        await sendEmailViaResend(
          userEmail,
          'Your Flashcards data export is ready',
          `
            <p>Your personal data export is ready to download.</p>
            <p>
              <a href="${APP_URL}/settings/privacy">Go to Privacy Settings to download your data</a>
              (available for 48 hours).
            </p>
            <p>
              The export includes your profile, decks, notes, cards, study history,
              and learning preferences in JSON format.
            </p>
          `
        )
      } catch (emailErr) {
        // Non-fatal: export is ready in storage; user can still download from the settings page
        console.error(JSON.stringify({ action: 'gdpr.export.ready_email_failed', jobId, error: String(emailErr) }))
      }
    }

    console.log(`Export job ${jobId} completed for user ${userId}`)
    return new Response(JSON.stringify({ status: 'ready', jobId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(JSON.stringify({ action: 'gdpr.export.job_failed', jobId, userId, error: message }))

    // Mark job as failed
    await supabase
      .from('data_export_jobs')
      .update({
        status: 'failed',
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    // Attempt to send failure email (best effort)
    const { data: authData } = await supabase.auth.admin.getUserById(userId)
    const userEmail = authData?.user?.email ?? null
    if (userEmail) {
      await sendEmailViaResend(
        userEmail,
        'Your Flashcards data export failed',
        `
          <p>We were unable to generate your data export.</p>
          <p>
            <a href="${APP_URL}/settings/privacy">Try again from your Privacy Settings</a>.
          </p>
          <p>If the problem persists, please contact support.</p>
        `
      ).catch(emailErr => {
        console.error(JSON.stringify({ action: 'gdpr.export.failure_email_failed', jobId, error: String(emailErr) }))
      })
    }

    return new Response(JSON.stringify({ status: 'failed', jobId, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend API error ${res.status}: ${body}`)
  }
}
