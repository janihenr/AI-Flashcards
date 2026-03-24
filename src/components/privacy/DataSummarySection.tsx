import type { ProfileTier } from '@/types'

interface DataSummarySectionProps {
  profile: {
    displayName: string | null
    tier: ProfileTier
    gdprConsentAt: Date | null
    createdAt: Date
    hasFormatPreferences: boolean
    hasCustomFsrsParams: boolean
  }
  counts: {
    decks: number
    notes: number
    cards: number
    reviews: number
    activeSessions: number
  }
}

export function DataSummarySection({ profile, counts }: DataSummarySectionProps) {
  return (
    <dl className="text-sm flex flex-col gap-3">
      {/* Profile */}
      <div>
        <dt className="font-medium">Display name</dt>
        <dd className="text-muted-foreground">{profile.displayName ?? '(not set)'}</dd>
      </div>
      <div>
        <dt className="font-medium">Subscription tier</dt>
        <dd className="text-muted-foreground capitalize">{profile.tier}</dd>
      </div>
      <div>
        <dt className="font-medium">Account created</dt>
        <dd className="text-muted-foreground">{profile.createdAt.toLocaleDateString('en-GB')}</dd>
      </div>
      <div>
        <dt className="font-medium">GDPR consent given</dt>
        <dd className="text-muted-foreground">
          {profile.gdprConsentAt ? profile.gdprConsentAt.toLocaleDateString('en-GB') : 'Not recorded'}
        </dd>
      </div>

      {/* Decks & Content */}
      <div>
        <dt className="font-medium">Decks</dt>
        <dd className="text-muted-foreground">{counts.decks} deck{counts.decks !== 1 ? 's' : ''}</dd>
      </div>
      <div>
        <dt className="font-medium">Notes</dt>
        <dd className="text-muted-foreground">{counts.notes} note{counts.notes !== 1 ? 's' : ''}</dd>
      </div>
      <div>
        <dt className="font-medium">Cards</dt>
        <dd className="text-muted-foreground">{counts.cards} card{counts.cards !== 1 ? 's' : ''}</dd>
      </div>

      {/* Study History */}
      <div>
        <dt className="font-medium">Study reviews</dt>
        <dd className="text-muted-foreground">{counts.reviews} review{counts.reviews !== 1 ? 's' : ''}</dd>
      </div>

      {/* Learning Fingerprint */}
      <div>
        <dt className="font-medium">Learning Fingerprint — format preferences</dt>
        <dd className="text-muted-foreground">
          {profile.hasFormatPreferences ? 'Stored' : 'Not yet collected'}
        </dd>
      </div>
      <div>
        <dt className="font-medium">Learning Fingerprint — custom FSRS parameters</dt>
        <dd className="text-muted-foreground">
          {profile.hasCustomFsrsParams ? 'Stored' : 'Not yet collected'}
        </dd>
      </div>

      {/* Sessions */}
      <div>
        <dt className="font-medium">Active sessions</dt>
        <dd className="text-muted-foreground">
          {counts.activeSessions} active session{counts.activeSessions !== 1 ? 's' : ''}
        </dd>
      </div>

      {/* Payment statement — required by AC #3 */}
      <div>
        <dt className="font-medium">Payment data</dt>
        <dd className="text-muted-foreground">
          Payment card data is managed by Stripe and is not stored by Flashcards.
        </dd>
      </div>
    </dl>
  )
}
