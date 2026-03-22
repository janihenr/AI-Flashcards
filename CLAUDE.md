@AGENTS.md

## Third-Party Library Documentation

When writing or modifying code that uses any third-party library or service (Supabase, Drizzle ORM, Next.js, Vercel AI SDK, Sentry, Stripe, Resend, Playwright, Vitest, etc.), **always use Context7 MCP to fetch up-to-date documentation first**:

1. Call `mcp__context7__resolve-library-id` to find the library ID
2. Call `mcp__context7__query-docs` to retrieve relevant documentation
3. Implement based on the fetched docs — do not rely on training-data knowledge for API signatures, configuration options, or SDK patterns

This ensures implementations use current APIs and avoid deprecated patterns.
