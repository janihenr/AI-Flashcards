import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema',
  out: './supabase/migrations',
  casing: 'camelCase', // snake_case DB → camelCase TypeScript automatically
})
