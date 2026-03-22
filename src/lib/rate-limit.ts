import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { INVITE_RATE_LIMIT } from '@/lib/constants'

// Shared Redis instance — reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN from env
const redis = Redis.fromEnv()

// Reusable factory — creates a rate limiter per window config
export function createRateLimiter(
  maxAttempts: number,
  windowDuration: `${number} s` | `${number} m` | `${number} h`
) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxAttempts, windowDuration),
    analytics: true, // enables Upstash dashboard analytics
  })
}

// Pre-configured limiters for known use cases
export const authLimiter = createRateLimiter(10, '15 m')                        // NFR-SEC7: auth brute-force
export const aiGenerationLimiter = createRateLimiter(3, '1 m')                  // burst throttle (free users)
export const teamInviteLimiter = createRateLimiter(INVITE_RATE_LIMIT, '1 h')    // INVITE_RATE_LIMIT constant

// Wrapper — rateLimit(limiter, identifier) → { success, remaining }
export async function rateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number }> {
  const { success, remaining } = await limiter.limit(identifier)
  return { success, remaining }
}
