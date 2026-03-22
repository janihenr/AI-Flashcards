import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

// Canonical section order: images → headers → redirects → experimental
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage domain will be added in Story 1.2
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
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self' https://vitals.vercel-insights.com https://*.sentry.io",
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

  experimental: {
    // turbopack is enabled via next dev --turbopack flag in dev script
  },
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
