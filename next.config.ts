import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

// Startup validation — fails fast if system user is missing (cold start deck would break silently)
if (typeof window === 'undefined' && process.env.DATABASE_URL && process.env.SYSTEM_USER_ID) {
  import('@/server/db/queries/users').then(({ validateSystemUser }) => {
    validateSystemUser().catch((err: Error) => {
      console.error('[STARTUP FAILURE]', err.message)
      process.exit(1)
    })
  })
}

// Canonical section order: images → headers → redirects → experimental
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval required by Next.js dev
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co",
              "font-src 'self'",
              "connect-src 'self' https://vitals.vercel-insights.com https://*.sentry.io https://*.supabase.co",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },

  async redirects() {
    return []
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  experimental: {
    // turbopack is enabled via next dev --turbopack flag in dev script
    serverActionsBodySizeLimit: '6mb',
  } as any,
}

export default withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Silently suppress Sentry build output
  silent: !process.env.CI,

  // Upload source maps to Sentry for better error tracking
  widenClientFileUpload: true,

  // Automatically instrument Next.js routes
  autoInstrumentServerFunctions: true,

  // Disable the Sentry telemetry
  disableLogger: true,
})
