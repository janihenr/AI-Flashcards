import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/server/db'
import { dataExportJobs } from '@/server/db/schema'
import type { Result } from '@/types'

/** Returns the active (pending or processing) export job id for the given user, or null if none. */
export async function getActiveExportJob(
  userId: string
): Promise<Result<{ id: string } | null>> {
  try {
    const rows = await db
      .select({ id: dataExportJobs.id })
      .from(dataExportJobs)
      .where(
        and(
          eq(dataExportJobs.userId, userId),
          inArray(dataExportJobs.status, ['pending', 'processing'])
        )
      )
      .limit(1)
    return { data: rows[0] ?? null, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}

/** Inserts a new data_export_jobs row and returns its id. */
export async function createExportJob(userId: string): Promise<Result<{ id: string }>> {
  try {
    const [job] = await db
      .insert(dataExportJobs)
      .values({ userId })
      .returning({ id: dataExportJobs.id })
    return { data: { id: job.id }, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
