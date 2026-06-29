export { AnthropicLLMClient } from './client.js'
export { MODEL_MAP, resolveModel } from './models.js'
export type {
  LLMModel,
  LLMMessage,
  LLMTool,
  LLMToolInputSchema,
  LLMRequest,
  LLMResponse,
  LLMUsage,
  StreamChunk,
  StreamChunkText,
  StreamChunkToolUse,
  StreamChunkMessageStart,
  StreamChunkMessageDelta,
  StreamChunkDone,
  ContentBlock,
  TextBlock,
  ToolUseBlock,
  ToolResultBlock,
} from './types.js'

import { AnthropicLLMClient } from './client.js'
export const LLMClient = new AnthropicLLMClient()
