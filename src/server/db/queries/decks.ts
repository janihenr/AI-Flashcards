import { unstable_cache } from 'next/cache'
import { eq, isNull, and } from 'drizzle-orm'
import { db } from '@/server/db'
import { decks } from '@/server/db/schema'
import type { Result } from '@/types'
import type { PaginationInput, PaginationResult } from '@/lib/pagination'
import { encodeCursor, decodeCursor } from '@/lib/pagination'

export async function findDecksByUserId(
  userId: string,
  pagination: PaginationInput
): Promise<Result<PaginationResult<typeof decks.$inferSelect>>> {
  try {
    const limit = Math.max(1, Math.min(pagination.limit, 100))
    const rows = await db.query.decks.findMany({
      where: (t, { and, eq: eqFn, isNull: isNullFn, lt }) => {
        const conditions = [eqFn(t.userId, userId), isNullFn(t.deletedAt)]
        if (pagination.cursor) {
          const cursorDate = decodeCursor(pagination.cursor)
          const d = new Date(cursorDate)
          if (!isNaN(d.getTime())) conditions.push(lt(t.createdAt, d))
        }
        return and(...conditions)
      },
      orderBy: (t, { desc }) => desc(t.createdAt),
      limit: limit + 1,
    })

    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? encodeCursor(items[items.length - 1].createdAt.toISOString()) : null

    return { data: { items, nextCursor }, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}

/**
 * Returns the system-owned cold start deck.
 * Cached for 1 hour — call revalidateTag('system-deck') after re-seeding.
 * Resolves the system user from SYSTEM_USER_ID env var (set after initial seed run).
 * Env-var check runs outside the cache boundary so a missing var is never cached.
 */
export async function getSystemDeck(): Promise<Result<typeof decks.$inferSelect>> {
  const systemUserId = process.env.SYSTEM_USER_ID
  if (!systemUserId) {
    return { data: null, error: { message: 'SYSTEM_USER_ID env var not configured', code: 'NOT_FOUND' } }
  }
  return _getSystemDeckCached(systemUserId)
}

const _getSystemDeckCached = unstable_cache(
  async (systemUserId: string): Promise<Result<typeof decks.$inferSelect>> => {
    try {
      const deck = await db.query.decks.findFirst({
        where: and(eq(decks.userId, systemUserId), isNull(decks.deletedAt)),
      })
      if (!deck) return { data: null, error: { message: 'System deck not found', code: 'NOT_FOUND' } }
      return { data: deck, error: null }
    } catch {
      return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
    }
  },
  // Include systemUserId in key so changing SYSTEM_USER_ID env var busts the cache immediately
  ['system-deck', process.env.SYSTEM_USER_ID ?? ''],
  { tags: ['system-deck'], revalidate: 3600 }
)

export async function createDeck(
  userId: string,
  data: { title: string; subject?: string | null }
): Promise<Result<{ id: string }>> {
  try {
    const [row] = await db
      .insert(decks)
      .values({
        userId,
        title: data.title,
        subject: data.subject ?? null,
      })
      .returning({ id: decks.id })

    if (!row) return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
    return { data: { id: row.id }, error: null }
  } catch (err) {
    console.error('[createDeck] DB error:', err)
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}

export async function getDeckById(deckId: string): Promise<Result<typeof decks.$inferSelect>> {
  try {
    const deck = await db.query.decks.findFirst({
      where: (t, { and, eq: eqFn, isNull: isNullFn }) =>
        and(eqFn(t.id, deckId), isNullFn(t.deletedAt)),
    })
    if (!deck) return { data: null, error: { message: 'Deck not found', code: 'NOT_FOUND' } }
    return { data: deck, error: null }
  } catch {
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
