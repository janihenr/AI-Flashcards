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
//
// Models are lazily constructed via ES getters — env vars are only validated when the model is
// first accessed, not at server startup. Allows running the app without all three tiers configured.
type AzureModel = ReturnType<ReturnType<typeof createAzure>['chat']>
const _cache = new Map<string, AzureModel>()

function getModel(key: string, endpointVar: string, keyVar: string, deploymentVar: string): AzureModel {
  if (!_cache.has(key)) {
    _cache.set(key, createAzure({
      baseURL: requiredEnv(endpointVar),
      apiKey: requiredEnv(keyVar),
      apiVersion: '2025-01-01-preview',
      useDeploymentBasedUrls: true,
    }).chat(requiredEnv(deploymentVar)))
  }
  return _cache.get(key)!
}

export const aiModels = {
  get fast()     { return getModel('fast',     'AZURE_OPENAI_ENDPOINT_FAST',     'AZURE_OPENAI_API_KEY_FAST',     'AZURE_OPENAI_DEPLOYMENT_FAST')     }, // gpt-4.1-mini — card gen, Learning Fingerprint analysis
  get large()    { return getModel('large',    'AZURE_OPENAI_ENDPOINT_LARGE',    'AZURE_OPENAI_API_KEY_LARGE',    'AZURE_OPENAI_DEPLOYMENT_LARGE')    }, // gpt-4.1 — long doc ingestion (1M context required)
  get fallback() { return getModel('fallback', 'AZURE_OPENAI_ENDPOINT_FALLBACK', 'AZURE_OPENAI_API_KEY_FALLBACK', 'AZURE_OPENAI_DEPLOYMENT_FALLBACK') }, // gpt-4o — fallback on timeout/error
}
