import { eq, asc, and, gt, or, getTableColumns } from 'drizzle-orm'
import { db } from '@/server/db'
import { cards, notes } from '@/server/db/schema'
import type { Result } from '@/types'
import type { PaginationInput, PaginationResult } from '@/lib/pagination'
import { encodeCursor, decodeCursor } from '@/lib/pagination'

export async function findCardsDue(
  userId: string,
  pagination: PaginationInput
): Promise<Result<PaginationResult<typeof cards.$inferSelect>>> {
  try {
    const limit = Math.max(1, Math.min(pagination.limit, 100))
    const now = new Date()
    const rows = await db.query.cards.findMany({
      where: (t, { and, or, eq: eqFn, lte, gt }) => {
        const conditions = [eqFn(t.userId, userId), lte(t.due, now)]
        if (pagination.cursor) {
          // Composite cursor: "isoDate|uuid" — prevents silent row skipping when cards share due timestamp
          const decoded = decodeCursor(pagination.cursor)
          const sepIdx = decoded.lastIndexOf('|')
          if (sepIdx !== -1) {
            const d = new Date(decoded.slice(0, sepIdx))
            const cursorId = decoded.slice(sepIdx + 1)
            if (!isNaN(d.getTime()) && cursorId) {
              const cursorCondition = or(
                gt(t.due, d),
                and(eqFn(t.due, d), gt(t.id, cursorId))
              )
              if (cursorCondition) conditions.push(cursorCondition)
            }
          }
        }
        return and(...conditions)
      },
      orderBy: (t, { asc }) => [asc(t.due), asc(t.id)],
      limit: limit + 1,
    })

    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const last = items[items.length - 1]
    const nextCursor = hasMore
      ? encodeCursor(`${last.due.toISOString()}|${last.id}`)
      : null

    return { data: { items, nextCursor }, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}

/**
 * Returns all cards for a deck, ordered by createdAt ASC with cursor-based pagination.
 * Joins through notes since cards link to decks via notes.
 */
export async function findCardsByDeckId(
  deckId: string,
  pagination: PaginationInput
): Promise<Result<PaginationResult<typeof cards.$inferSelect>>> {
  try {
    const limit = Math.max(1, Math.min(pagination.limit, 100))

    // Composite cursor: "isoDate|uuid" — prevents silent row skipping when cards share createdAt
    let cursorCondition = undefined
    if (pagination.cursor) {
      const decoded = decodeCursor(pagination.cursor)
      const sepIdx = decoded.lastIndexOf('|')
      if (sepIdx !== -1) {
        const d = new Date(decoded.slice(0, sepIdx))
        const cursorId = decoded.slice(sepIdx + 1)
        if (!isNaN(d.getTime()) && cursorId) {
          cursorCondition = or(
            gt(cards.createdAt, d),
            and(eq(cards.createdAt, d), gt(cards.id, cursorId))
          )
        }
      }
    }

    const rows = await db
      .select(getTableColumns(cards))
      .from(cards)
      .innerJoin(notes, eq(cards.noteId, notes.id))
      .where(and(eq(notes.deckId, deckId), cursorCondition))
      .orderBy(asc(cards.createdAt), asc(cards.id))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const last = items[items.length - 1]
    const nextCursor = hasMore
      ? encodeCursor(`${last.createdAt.toISOString()}|${last.id}`)
      : null

    return { data: { items, nextCursor }, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
