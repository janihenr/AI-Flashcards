import { desc, eq, count, isNull, and } from 'drizzle-orm'
import { db } from '@/server/db'
import { dataExportJobs, decks, notes, cards, reviews, profiles } from '@/server/db/schema'
import { createUserClient } from '@/lib/supabase/user'
import { createServerAdminClient } from '@/lib/supabase/server'
import { DataExportSection } from '@/components/privacy/DataExportSection'
import { DataSummarySection } from '@/components/privacy/DataSummarySection'
import type { ProfileTier } from '@/types'
import { DeleteAccountSection } from '@/components/privacy/DeleteAccountSection'
import type { DataExportJobRow } from '@/server/db/schema'

export const metadata = { title: 'Privacy Settings' }

const VALID_TIERS: readonly ProfileTier[] = ['anonymous', 'free', 'pro', 'team_member', 'team_admin']
/** Returns the value if it is a valid ProfileTier; falls back to 'free' for unknown DB values. */
function narrowTier(value: string | null | undefined): ProfileTier {
  return VALID_TIERS.includes(value as ProfileTier) ? (value as ProfileTier) : 'free'
}

export default async function PrivacySettingsPage() {
  const userClient = await createUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  // (app) layout already redirects unauthenticated users; user is guaranteed non-null here

  // adminClient always created — needed for both session count (unconditional) and signed URL (conditional)
  const adminClient = createServerAdminClient()

  const [
    jobs,
    profileRows,
    [{ deckCount }],
    [{ noteCount }],
    [{ cardCount }],
    [{ reviewCount }],
    sessionsResult,
  ] = await Promise.all([
    db.select()
      .from(dataExportJobs)
      .where(eq(dataExportJobs.userId, user!.id))
      .orderBy(desc(dataExportJobs.createdAt))
      .limit(1),
    db.select().from(profiles).where(eq(profiles.id, user!.id)),
    db.select({ deckCount: count() })
      .from(decks)
      .where(and(eq(decks.userId, user!.id), isNull(decks.deletedAt))),
    db.select({ noteCount: count() })
      .from(notes)
      .where(and(eq(notes.userId, user!.id), isNull(notes.deletedAt))),
    db.select({ cardCount: count() })
      .from(cards)
      .where(eq(cards.userId, user!.id)),
    db.select({ reviewCount: count() })
      .from(reviews)
      .where(eq(reviews.userId, user!.id)),
    adminClient
      .schema('auth')
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id),
  ])

  const latestJob: DataExportJobRow | null = jobs[0] ?? null
  const profileRow = profileRows[0] ?? null
  // Supabase count queries attach `count` directly on the response object (not inside `data`).
  // Errors are not logged here — read-only display; ?? 0 is the safe fallback per story spec.
  const activeSessionCount = (sessionsResult as { count: number | null }).count ?? 0

  // Generate a short-lived signed URL only when the export is ready and within its 48h window
  let downloadUrl: string | null = null
  if (
    latestJob?.status === 'ready' &&
    latestJob.filePath &&
    latestJob.expiresAt &&
    new Date(latestJob.expiresAt) > new Date()
  ) {
    const { data } = await adminClient.storage
      .from('data-exports')
      .createSignedUrl(latestJob.filePath, 3600) // 1-hour download window
    downloadUrl = data?.signedUrl ?? null
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold">Privacy Settings</h1>

      <section aria-labelledby="export-heading" className="flex flex-col gap-4">
        <h2 id="export-heading" className="text-base font-medium">Your Personal Data</h2>
        <p className="text-sm text-muted-foreground">
          Export all your personal data as a JSON file. Your export will be ready within 72 hours.
          Payment data is managed by Stripe and is not included.
        </p>
        <DataExportSection job={latestJob} downloadUrl={downloadUrl} />
      </section>

      <section aria-labelledby="summary-heading" className="mt-8 flex flex-col gap-4">
        <h2 id="summary-heading" className="text-base font-medium">Your Data Summary</h2>
        <p className="text-sm text-muted-foreground">
          An overview of all personal data stored about you in Flashcards.
        </p>
        <DataSummarySection
          profile={{
            displayName: profileRow?.displayName ?? null,
            tier: narrowTier(profileRow?.tier),
            gdprConsentAt: profileRow?.gdprConsentAt ?? null,
            // Fall back to auth signup date rather than fabricating "today" if the profile row is absent
            createdAt: profileRow?.createdAt ?? new Date(user!.created_at),
            hasFormatPreferences: profileRow?.formatPreferences !== null && profileRow?.formatPreferences !== undefined,
            hasCustomFsrsParams: profileRow?.userFsrsParams !== null && profileRow?.userFsrsParams !== undefined,
          }}
          counts={{
            decks: deckCount,
            notes: noteCount,
            cards: cardCount,
            reviews: reviewCount,
            activeSessions: activeSessionCount,
          }}
        />
      </section>

      <section aria-labelledby="delete-heading" className="mt-8 flex flex-col gap-4">
        <h2 id="delete-heading" className="text-base font-medium text-destructive">
          Delete Account
        </h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated personal data. This action cannot be undone.
        </p>
        <DeleteAccountSection />
      </section>
    </div>
  )
}
