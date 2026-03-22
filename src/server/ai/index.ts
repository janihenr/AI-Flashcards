// Server-only — AI keys MUST NEVER be exposed to the client
import { createAzure } from '@ai-sdk/azure'

const azure = createAzure({
  resourceName: process.env.AZURE_OPENAI_ENDPOINT!,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
})

export const aiModels = {
  fast: azure(process.env.AZURE_OPENAI_DEPLOYMENT_FAST!), // gpt-4o-mini — card generation
  large: azure(process.env.AZURE_OPENAI_DEPLOYMENT_LARGE!), // gpt-4.1 — long doc ingestion
  fallback: azure(process.env.AZURE_OPENAI_DEPLOYMENT_FALLBACK!), // gpt-4o — fallback on error
} as const
