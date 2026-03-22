import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import * as relations from './relations'

// Transaction mode pooler — { prepare: false } required for Supabase Pooler (serverless)
// DATABASE_URL = Supabase Pooler transaction mode URL (port 6543)
const client = postgres(process.env.DATABASE_URL!, { prepare: false })

// Spread relations into schema for stable relations() API (defineRelations is beta-only)
// casing: 'snake_case' maps camelCase TS properties ↔ snake_case DB columns
export const db = drizzle({ client, schema: { ...schema, ...relations }, casing: 'snake_case' })

// Re-export schema for use in DAL queries
export * from './schema'
