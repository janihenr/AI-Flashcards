export interface PaginationInput {
  limit: number    // page size (default 20, max 100)
  cursor?: string  // base64url-encoded cursor; undefined = first page
}

export interface PaginationResult<T> {
  items: T[]
  nextCursor: string | null  // null = no more pages
}

// Encode: base64url of ISO timestamp (or any string cursor value)
export function encodeCursor(value: string): string {
  return Buffer.from(value).toString('base64url')
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf-8')
}
// Usage: fetch limit+1 items; if items.length > limit, slice and set nextCursor = encodeCursor(items[limit].createdAt.toISOString())
