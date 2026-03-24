/**
 * Unit tests for updateProfile DAL function — no DB needed.
 * Tests the no-op guard and the DB-error branch using db.update spy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the db module so we control what update() returns
vi.mock('@/server/db', () => {
  const chainMock = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  }
  return {
    db: {
      update: vi.fn().mockReturnValue(chainMock),
      _chain: chainMock,
    },
  }
})

import { db } from '@/server/db'
import { updateProfile } from '@/server/db/queries/users'

describe('updateProfile DAL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset chain mock to resolve normally by default
    const chain = (db as unknown as { _chain: { where: ReturnType<typeof vi.fn> } })._chain
    chain.where.mockResolvedValue(undefined)
  })

  it('returns success without calling db.update when data is empty', async () => {
    const result = await updateProfile('user-1', {})

    expect(result.error).toBeNull()
    expect(result.data).toBeUndefined()
    expect(db.update).not.toHaveBeenCalled()
  })

  it('returns success and calls db.update with whitelisted displayName only', async () => {
    const result = await updateProfile('user-1', { displayName: 'Alice' })

    expect(result.error).toBeNull()
    expect(db.update).toHaveBeenCalledTimes(1)
  })

  it('returns DB_ERROR and logs when db.update throws', async () => {
    const chain = (db as unknown as { _chain: { where: ReturnType<typeof vi.fn> } })._chain
    chain.where.mockRejectedValue(new Error('connection refused'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await updateProfile('user-1', { displayName: 'Alice' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
    expect(consoleSpy).toHaveBeenCalledWith(
      '[updateProfile] DB error:',
      expect.any(Error)
    )
    consoleSpy.mockRestore()
  })
})
