export type LLMModel = 'haiku' | 'sonnet' | 'opus'

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string | TextBlock[]
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentBlock[]
}

export interface LLMToolInputSchema {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
}

export interface LLMTool {
  name: string
  description: string
  input_schema: LLMToolInputSchema
}

export interface LLMRequest {
  model: LLMModel
  messages: LLMMessage[]
  tools?: LLMTool[]
  system?: string
  max_tokens?: number
  stream?: boolean
}

export interface LLMUsage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

export interface LLMResponse {
  content: ContentBlock[]
  model: string
  usage: LLMUsage
  stop_reason: string | null
}

export interface StreamChunkText {
  type: 'text'
  text: string
}

export interface StreamChunkToolUse {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface StreamChunkMessageStart {
  type: 'message_start'
  model: string
  usage: LLMUsage
}

export interface StreamChunkMessageDelta {
  type: 'message_delta'
  stop_reason: string | null
  usage?: Pick<LLMUsage, 'output_tokens'>
}

export interface StreamChunkDone {
  type: 'done'
}

export type StreamChunk =
  | StreamChunkText
  | StreamChunkToolUse
  | StreamChunkMessageStart
  | StreamChunkMessageDelta
  | StreamChunkDone
