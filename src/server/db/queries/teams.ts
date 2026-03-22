import { db } from '@/server/db'
import { teams } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import type { Result } from '@/types'

export async function getTeamById(teamId: string): Promise<Result<typeof teams.$inferSelect>> {
  try {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    })
    if (!team) return { data: null, error: { message: 'Team not found', code: 'NOT_FOUND' } }
    return { data: team, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
