/**
 * Integration tests for Story 2-4: GDPR Personal Data Export
 *
 * Tests the requestDataExport Server Action with all external dependencies mocked.
 * Covers auth guard, duplicate job prevention, success path, and non-fatal email failure.
 *
 * Run with: pnpm test tests/integration/data-export-request.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock declarations (must precede imports of the mocked modules) ──────────

vi.mock('next/server', () => ({
  after: vi.fn(), // swallow background trigger — prevent real Edge Function calls
}))

vi.mock('@/lib/supabase/user', () => ({
  createUserClient: vi.fn(),
}))

vi.mock('@/server/email', () => ({
  sendEmail: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  log: vi.fn(),
}))

// Mock the DAL functions — NOT the raw Drizzle db (Server Actions must not bypass the DAL)
vi.mock('@/server/db/queries/exportJobs', () => ({
  getActiveExportJob: vi.fn(),
  createExportJob: vi.fn(),
}))

// ─── Imports after mocks ─────────────────────────────────────────────────────

import { after } from 'next/server'
import { createUserClient } from '@/lib/supabase/user'
import { sendEmail } from '@/server/email'
import { log } from '@/lib/logger'
import { getActiveExportJob, createExportJob } from '@/server/db/queries/exportJobs'
import { requestDataExport } from '@/app/(app)/settings/privacy/actions'

// ─── Type helpers ────────────────────────────────────────────────────────────

type MockUserClient = {
  auth: {
    getUser: ReturnType<typeof vi.fn>
  }
}

// ─── Mock factories ──────────────────────────────────────────────────────────

function makeAuthenticatedUser(overrides: Partial<{ id: string; email: string; displayName: string }> = {}) {
  const { id = 'user-abc', email = 'user@example.com', displayName = 'Alice' } = overrides
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id,
            email,
            user_metadata: { display_name: displayName },
          },
        },
        error: null,
      }),
    },
  } satisfies MockUserClient
}

function makeUnauthenticatedUser(): MockUserClient {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      }),
    },
  }
}

// Set a required env var that the action uses
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SECRET_KEY = 'test-service-key'

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  // Default: authenticated user
  vi.mocked(createUserClient).mockResolvedValue(makeAuthenticatedUser() as never)

  // Default: no existing pending jobs
  vi.mocked(getActiveExportJob).mockResolvedValue({ data: null, error: null })

  // Default: insert returns a job id
  vi.mocked(createExportJob).mockResolvedValue({ data: { id: 'job-xyz' }, error: null })

  // Default: email sends successfully
  vi.mocked(sendEmail).mockResolvedValue({ error: null })
})

// ─── Auth guard ──────────────────────────────────────────────────────────────

describe('requestDataExport — auth guard', () => {
  it('returns UNAUTHORIZED when getUser returns no user', async () => {
    vi.mocked(createUserClient).mockResolvedValue(makeUnauthenticatedUser() as never)

    const result = await requestDataExport()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns UNAUTHORIZED when getUser returns an auth error', async () => {
    vi.mocked(createUserClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Session expired' },
        }),
      },
    } as never)

    const result = await requestDataExport()

    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('does not insert a job when unauthenticated', async () => {
    vi.mocked(createUserClient).mockResolvedValue(makeUnauthenticatedUser() as never)

    await requestDataExport()

    expect(vi.mocked(createExportJob)).not.toHaveBeenCalled()
  })
})

// ─── Duplicate job prevention ─────────────────────────────────────────────────

describe('requestDataExport — duplicate job prevention', () => {
  it('returns EXPORT_IN_PROGRESS when a pending job already exists', async () => {
    vi.mocked(getActiveExportJob).mockResolvedValue({ data: { id: 'existing-job-id' }, error: null })

    const result = await requestDataExport()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('EXPORT_IN_PROGRESS')
  })

  it('does not insert a new job when one is already pending', async () => {
    vi.mocked(getActiveExportJob).mockResolvedValue({ data: { id: 'existing-job-id' }, error: null })

    await requestDataExport()

    expect(vi.mocked(createExportJob)).not.toHaveBeenCalled()
  })
})

// ─── Success path ─────────────────────────────────────────────────────────────

describe('requestDataExport — success', () => {
  it('returns { data: { jobId }, error: null } on success', async () => {
    const result = await requestDataExport()

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ jobId: 'job-xyz' })
  })

  it('inserts a job row for the authenticated user', async () => {
    await requestDataExport()

    expect(vi.mocked(createExportJob)).toHaveBeenCalledWith('user-abc')
  })

  it('sends an ACK email to the authenticated user email address', async () => {
    await requestDataExport()

    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.anything(), // React element
      'user@example.com',
      'Your data export request has been received'
    )
  })

  it('calls after() to schedule background Edge Function trigger', async () => {
    await requestDataExport()

    expect(vi.mocked(after)).toHaveBeenCalledTimes(1)
  })
})

// ─── Non-fatal email failure ──────────────────────────────────────────────────

describe('requestDataExport — non-fatal email failure', () => {
  it('still returns success when ACK email fails', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ error: 'SMTP timeout' })

    const result = await requestDataExport()

    expect(result.error).toBeNull()
    expect(result.data?.jobId).toBe('job-xyz')
  })

  it('logs an error when ACK email fails', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ error: 'SMTP timeout' })

    await requestDataExport()

    expect(vi.mocked(log)).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'gdpr.export.ack_email_failed' })
    )
  })

  it('still calls after() for Edge Function trigger even if email fails', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ error: 'SMTP timeout' })

    await requestDataExport()

    expect(vi.mocked(after)).toHaveBeenCalledTimes(1)
  })
})

// ─── Contract tests ───────────────────────────────────────────────────────────

describe('requestDataExport — contract', () => {
  it('is importable and exports a function', () => {
    expect(typeof requestDataExport).toBe('function')
  })
})
