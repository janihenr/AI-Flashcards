export const HESITATION_THRESHOLD_MS = 10_000 // strictly > (not >=); exactly 10000ms does NOT trigger
export const FSRS_DEFAULT_RETENTION = 0.9 // 90% desired retention target for ts-fsrs
export const MAX_FREE_GENERATIONS = 10 // monthly AI cap for free-tier (calendar month, UTC)
export const FINGERPRINT_MIN_SESSIONS = 5 // min sessions before Layer 2 prefs diverge from default
export const MIN_TEAM_SEATS = 3 // Stripe checkout minimum seats
export const WEAK_CARD_THRESHOLD = 0.70 // FSRS retrievability below this = weak card
export const INVITE_EXPIRY_DAYS = 7 // pending_invites expiry in days
export const INVITE_RATE_LIMIT = 20 // max team invite sends per admin per hour
