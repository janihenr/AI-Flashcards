import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { INVITE_RATE_LIMIT } from '@/lib/constants'

// Lazy limiter wrapper — defers both Redis init and Ratelimit construction to first call.
// Prevents crash at module load time when Upstash env vars are absent (e.g., local dev, CI).
function makeLazyLimiter(
  maxAttempts: number,
  windowDuration: `${number} s` | `${number} m` | `${number} h`
): Pick<Ratelimit, 'limit'> {
  let instance: Ratelimit | null = null
  return {
    limit(identifier: string) {
      if (!instance) {
        instance = new Ratelimit({
          redis: Redis.fromEnv(),
          limiter: Ratelimit.slidingWindow(maxAttempts, windowDuration),
          analytics: true, // enables Upstash dashboard analytics
        })
      }
      return instance.limit(identifier)
    },
  }
}

// Pre-configured limiters for known use cases
export const authLimiter = makeLazyLimiter(10, '15 m')                        // NFR-SEC7: auth brute-force
export const aiGenerationLimiter = makeLazyLimiter(3, '1 m')                  // burst throttle (free users)
export const teamInviteLimiter = makeLazyLimiter(INVITE_RATE_LIMIT, '1 h')    // INVITE_RATE_LIMIT constant

// Wrapper — rateLimit(limiter, identifier) → { success, remaining }
export async function rateLimit(
  limiter: Pick<Ratelimit, 'limit'>,
  identifier: string
): Promise<{ success: boolean; remaining: number }> {
  const { success, remaining } = await limiter.limit(identifier)
  return { success, remaining }
}
