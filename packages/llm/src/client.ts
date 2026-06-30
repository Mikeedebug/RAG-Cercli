import Anthropic from '@anthropic-ai/sdk';
import { resolveModel } from './models.js';
import type {
  LLMRequest,
  LLMResponse,
  StreamChunk,
  ContentBlock,
  LLMUsage,
} from './types.js';

const HELICONE_BASE_URL = 'https://anthropic.helicone.ai';
const CACHE_THRESHOLD = 1024; // characters; apply cache_control to system prompts above this length

function buildClient(): Anthropic {
  const heliconeKey = process.env.HELICONE_API_KEY;

  if (heliconeKey) {
    return new Anthropic({
      baseURL: HELICONE_BASE_URL,
      defaultHeaders: {
        'helicone-auth': `Bearer ${heliconeKey}`,
      },
    });
  }

  return new Anthropic();
}

function buildSystemParam(
  system: string | undefined
): Anthropic.MessageParam['content'] | Anthropic.Messages.TextBlockParam[] | undefined {
  if (!system) return undefined;

  if (system.length >= CACHE_THRESHOLD) {
    return [
      {
        type: 'text',
        text: system,
        cache_control: { type: 'ephemeral' },
      } as Anthropic.Messages.TextBlockParam & { cache_control: { type: 'ephemeral' } },
    ];
  }

  return system;
}

function mapMessages(request: LLMRequest): Anthropic.MessageParam[] {
  return request.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content:
        typeof m.content === 'string'
          ? m.content
          : (m.content as Anthropic.ContentBlockParam[]),
    }));
}

function mapTools(request: LLMRequest): Anthropic.Tool[] | undefined {
  if (!request.tools || request.tools.length === 0) return undefined;
  return request.tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool['input_schema'],
  }));
}

export class AnthropicLLMClient {
  private client: Anthropic;

  constructor() {
    this.client = buildClient();
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = resolveModel(request.model);
    const system = buildSystemParam(request.system);
    const messages = mapMessages(request);
    const tools = mapTools(request);

    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model,
      max_tokens: request.max_tokens ?? 8192,
      messages,
      ...(system !== undefined && { system: system as string | Anthropic.TextBlockParam[] }),
      ...(tools && { tools }),
    };

    // Use adaptive thinking for opus
    if (request.model === 'opus') {
      (params as Record<string, unknown>).thinking = { type: 'adaptive' };
    }

    const response = await this.client.messages.create(params);

    return {
      content: response.content as unknown as ContentBlock[],
      model: response.model,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_creation_input_tokens:
          (response.usage as Record<string, unknown>).cache_creation_input_tokens as
            | number
            | undefined,
        cache_read_input_tokens:
          (response.usage as Record<string, unknown>).cache_read_input_tokens as
            | number
            | undefined,
      },
      stop_reason: response.stop_reason ?? null,
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<StreamChunk> {
    const model = resolveModel(request.model);
    const system = buildSystemParam(request.system);
    const messages = mapMessages(request);
    const tools = mapTools(request);

    const params: Anthropic.MessageStreamParams = {
      model,
      max_tokens: request.max_tokens ?? 8192,
      messages,
      ...(system !== undefined && { system: system as string | Anthropic.TextBlockParam[] }),
      ...(tools && { tools }),
    };

    if (request.model === 'opus') {
      (params as Record<string, unknown>).thinking = { type: 'adaptive' };
    }

    const stream = this.client.messages.stream(params);

    // Emit message_start when the response begins
    const initialMsg = await stream.initialMessage().catch(() => null);
    if (initialMsg) {
      const usage: LLMUsage = {
        input_tokens: initialMsg.usage.input_tokens,
        output_tokens: initialMsg.usage.output_tokens,
      };
      yield { type: 'message_start', model: initialMsg.model, usage };
    }

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if (delta.type === 'text_delta') {
          yield { type: 'text', text: delta.text };
        } else if (delta.type === 'input_json_delta') {
          // partial tool input — skip; tool_use is emitted on content_block_stop
        }
      } else if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block.type === 'tool_use') {
          // will be emitted complete on content_block_stop
        }
      } else if (event.type === 'message_delta') {
        yield {
          type: 'message_delta',
          stop_reason: event.delta.stop_reason ?? null,
          usage: event.usage ? { output_tokens: event.usage.output_tokens } : undefined,
        };
      }
    }

    // Emit completed tool_use blocks
    const finalMsg = await stream.finalMessage();
    for (const block of finalMsg.content) {
      if (block.type === 'tool_use') {
        yield {
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        };
      }
    }

    yield { type: 'done' };
  }
}
