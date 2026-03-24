import { db } from '@/server/db'
import { notes } from '@/server/db/schema'
import type { Result } from '@/types'

type TxContext = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function createNote(
  userId: string,
  deckId: string,
  content: string,
  tx?: TxContext
): Promise<Result<{ id: string }>> {
  const executor = tx ?? db
  try {
    const [row] = await executor
      .insert(notes)
      .values({ userId, deckId, content })
      .returning({ id: notes.id })
    if (!row) return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
    return { data: { id: row.id }, error: null }
  } catch (err) {
    console.error('[createNote] DB error:', err)
    return { data: null, error: { message: 'Database error', code: 'DB_ERROR' } }
  }
}
