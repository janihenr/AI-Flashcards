import { track } from '@vercel/analytics'

type AppEvent =
  | 'cold_start_viewed'
  | 'signup'
  | 'deck_created'
  | 'ai_generation_used'
  | 'study_session_started'
  | 'study_session_completed'
  | 'paywall_hit'
  | 'upgrade'
  | 'team_created'
  | 'deck_assigned'

export function trackEvent(name: AppEvent, properties: Record<string, unknown>) {
  // Vercel Analytics — fire-and-forget, non-blocking
  // Analytics data loss is acceptable; this is NOT transactional
  void track(name, properties as Record<string, string | number | boolean | null | undefined>)
}
