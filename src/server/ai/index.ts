import 'server-only'
import { createAzure } from '@ai-sdk/azure'

const requiredEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

// cognitiveservices.azure.com requires:
// - baseURL = https://{resource}.cognitiveservices.azure.com/openai (no /deployments suffix)
// - useDeploymentBasedUrls: true  → puts deployment name in URL path
// - .chat() accessor             → forces Chat Completions (Responses API not supported here)
const makeAzureModel = (endpointVar: string, keyVar: string, deploymentVar: string) =>
  createAzure({
    baseURL: requiredEnv(endpointVar),
    apiKey: requiredEnv(keyVar),
    apiVersion: '2025-01-01-preview',
    useDeploymentBasedUrls: true,
  }).chat(requiredEnv(deploymentVar))

export const aiModels = {
  fast: makeAzureModel('AZURE_OPENAI_ENDPOINT_FAST', 'AZURE_OPENAI_API_KEY_FAST', 'AZURE_OPENAI_DEPLOYMENT_FAST'), // gpt-4.1-mini — card gen, Learning Fingerprint analysis
  large: makeAzureModel('AZURE_OPENAI_ENDPOINT_LARGE', 'AZURE_OPENAI_API_KEY_LARGE', 'AZURE_OPENAI_DEPLOYMENT_LARGE'), // gpt-4.1 — long doc ingestion (1M context required)
  fallback: makeAzureModel('AZURE_OPENAI_ENDPOINT_FALLBACK', 'AZURE_OPENAI_API_KEY_FALLBACK', 'AZURE_OPENAI_DEPLOYMENT_FALLBACK'), // gpt-4o — fallback on timeout/error
} as const
