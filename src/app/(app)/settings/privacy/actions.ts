'use server'

import { after } from 'next/server'
import { createUserClient } from '@/lib/supabase/user'
import { getActiveExportJob, createExportJob } from '@/server/db/queries/exportJobs'
import { sendEmail } from '@/server/email'
import { DataExportAckEmail } from '@/server/email/templates/DataExportAckEmail'
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
