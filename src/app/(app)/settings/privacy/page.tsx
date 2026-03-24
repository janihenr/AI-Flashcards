import { desc, eq } from 'drizzle-orm'
import { db } from '@/server/db'
import { dataExportJobs } from '@/server/db/schema'
import { createUserClient } from '@/lib/supabase/user'
import { createServerAdminClient } from '@/lib/supabase/server'
import { DataExportSection } from '@/components/privacy/DataExportSection'
import type { DataExportJobRow } from '@/server/db/schema'

export const metadata = { title: 'Privacy Settings' }

export default async function PrivacySettingsPage() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  // (app) layout already redirects unauthenticated users; user is guaranteed non-null here

  const jobs = await db
    .select()
    .from(dataExportJobs)
    .where(eq(dataExportJobs.userId, user!.id))
    .orderBy(desc(dataExportJobs.createdAt))
    .limit(1)
  const latestJob: DataExportJobRow | null = jobs[0] ?? null

  // Generate a short-lived signed URL only when the export is ready and within its 48h window
  let downloadUrl: string | null = null
  if (
    latestJob?.status === 'ready' &&
    latestJob.filePath &&
    latestJob.expiresAt &&
    new Date(latestJob.expiresAt) > new Date()
  ) {
    const adminClient = createServerAdminClient()
    const { data } = await adminClient.storage
      .from('data-exports')
      .createSignedUrl(latestJob.filePath, 3600) // 1-hour download window
    downloadUrl = data?.signedUrl ?? null
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold">Privacy Settings</h1>

      <section aria-labelledby="export-heading" className="flex flex-col gap-4">
        <h2 id="export-heading" className="text-base font-medium">Your Personal Data</h2>
        <p className="text-sm text-muted-foreground">
          Export all your personal data as a JSON file. Your export will be ready within 72 hours.
          Payment data is managed by Stripe and is not included.
        </p>
        <DataExportSection job={latestJob} downloadUrl={downloadUrl} />
      </section>
    </main>
  )
}
