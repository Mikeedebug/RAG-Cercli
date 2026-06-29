import type { LLMModel } from './types.js'

export const MODEL_MAP: Record<LLMModel, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-8',
}

export function resolveModel(model: LLMModel): string {
  return MODEL_MAP[model]
}
