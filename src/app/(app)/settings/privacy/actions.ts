'use server'

import { after } from 'next/server'
import { eq } from 'drizzle-orm'
import { createUserClient } from '@/lib/supabase/user'
import { createServerAdminClient } from '@/lib/supabase/server'
import { db } from '@/server/db'
import { profiles, decks, notes, reviews } from '@/server/db/schema'
import { getActiveExportJob, createExportJob } from '@/server/db/queries/exportJobs'
import { sendEmail } from '@/server/email'
import { DataExportAckEmail } from '@/server/email/templates/DataExportAckEmail'
import { AccountDeletionEmail } from '@/server/email/templates/AccountDeletionEmail'
import { log } from '@/lib/logger'
import type { Result } from '@/types'

/**
 * Queues a GDPR personal data export job for the authenticated user.
 *
 * Flow:
 * 1. Verify authentication via getUser()
 * 2. Check no pending/processing job already exists (prevent duplicates)
 * 3. Insert job row (status: pending)
 * 4. Send ACK email synchronously (satisfies "within 5 minutes" AC)
 * 5. Trigger Edge Function in background via after() — non-blocking
 *
 * The Edge Function generates the JSON export, uploads to storage, and sends the
 * download-ready email when complete. If the trigger fails, the job stays pending
 * and the user can retry from the privacy settings page.
 */
export async function requestDataExport(): Promise<Result<{ jobId: string }>> {
  const userClient = await createUserClient()
  const { data: { user }, error: authError } = await userClient.auth.getUser()

  if (authError || !user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
  }

  // Prevent duplicate pending/processing jobs
  const activeCheck = await getActiveExportJob(user.id)
  if (activeCheck.error) return { data: null, error: activeCheck.error }
  if (activeCheck.data) {
    return { data: null, error: { message: 'Export already in progress', code: 'EXPORT_IN_PROGRESS' } }
  }

  if (!user.email) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
  }

  // Insert new job
  const createResult = await createExportJob(user.id)
  if (createResult.error) return { data: null, error: createResult.error }
  const jobId = createResult.data.id

  // Send ACK email synchronously before returning (satisfies "within 5 min" requirement)
  const { error: emailError } = await sendEmail(
    DataExportAckEmail({ userName: user.user_metadata?.display_name ?? null }),
    user.email,
    'Your data export request has been received'
  )
  if (emailError) {
    log({ action: 'gdpr.export.ack_email_failed', userId: user.id, error: emailError })
  }

  // Trigger processing in background — does not block the response
  after(async () => {
    await triggerExportProcessing(jobId)
  })

  return { data: { jobId }, error: null }
}

/**
 * Deletes the authenticated user's account and all associated personal data (GDPR right to erasure).
 *
 * Executes atomically within a Drizzle transaction:
 *   1. Soft-delete decks and notes (deleted_at = now)
 *   2. Hard-delete reviews (no soft-delete on reviews per architecture)
 *   3. Soft-delete profile + clear sensitive Learning Fingerprint fields
 *
 * After the transaction commits:
 *   4. Invalidate all active sessions via Supabase admin (scope: global)
 *   5. Send deletion confirmation email (non-fatal)
 *
 * The client redirects to '/' after receiving success — the session is already invalidated.
 */
export async function deleteAccount(): Promise<Result<void>> {
  const userClient = await createUserClient()
  const { data: { user }, error: authError } = await userClient.auth.getUser()

  if (authError || !user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }
  }

  const userId = user.id
  const now = new Date()

  try {
    await db.transaction(async (tx) => {
      // Soft-delete decks and notes
      await tx.update(decks).set({ deletedAt: now }).where(eq(decks.userId, userId))
      await tx.update(notes).set({ deletedAt: now }).where(eq(notes.userId, userId))
      // Hard-delete reviews (personal data — no retention value)
      await tx.delete(reviews).where(eq(reviews.userId, userId))
      // Soft-delete profile + clear sensitive Learning Fingerprint fields immediately
      await tx.update(profiles)
        .set({ deletedAt: now, userFsrsParams: null, formatPreferences: null, previousTier: null })
        .where(eq(profiles.id, userId))
    })
  } catch (err) {
    log({ action: 'gdpr.delete.transaction_failed', userId, error: String(err) })
    return { data: null, error: { message: 'Account deletion failed. Please try again.', code: 'DELETION_FAILED' } }
  }

  // Invalidate all sessions — cannot be rolled back, runs after transaction commit
  // Wrapped in try/catch: a thrown exception must not prevent the success response after
  // the transaction has already committed. Profile is soft-deleted; JWT expires within TTL (~1 hour).
  try {
    const adminClient = createServerAdminClient()
    const { error: signOutError } = await adminClient.auth.admin.signOut(userId, 'global')
    if (signOutError) {
      log({ action: 'gdpr.delete.signout_failed', userId, error: String(signOutError) })
    }
  } catch (err) {
    log({ action: 'gdpr.delete.signout_failed', userId, error: String(err) })
  }

  // Send deletion confirmation email (non-fatal)
  if (user.email) {
    const displayName = user.user_metadata?.display_name ?? null
    const { error: emailError } = await sendEmail(
      AccountDeletionEmail({ userName: displayName }),
      user.email,
      'Your Flashcards account has been deleted'
    )
    if (emailError) {
      log({ action: 'gdpr.delete.email_failed', userId, error: emailError })
    }
  }

  return { data: undefined, error: null }
}

async function triggerExportProcessing(jobId: string): Promise<void> {
  const edgeFunctionUrl =
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-data-export`
  try {
    const res = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      },
      body: JSON.stringify({ jobId }),
    })
    if (!res.ok) {
      log({ action: 'gdpr.export.trigger_failed', jobId, httpStatus: res.status })
    }
  } catch (err) {
    // Non-fatal: job stays 'pending'; user can retry from the privacy settings page
    log({ action: 'gdpr.export.trigger_failed', jobId, error: String(err) })
  }
}
