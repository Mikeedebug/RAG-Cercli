import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../core/prisma/prisma.service';

export interface FieldMappingProposal {
  mappings: Array<{ sourceField: string; targetField: string; confidence: number; notes?: string }>;
}

@Injectable()
export class AiFieldMappingService {
  private readonly logger = new Logger(AiFieldMappingService.name);
  private readonly anthropic: Anthropic;

  constructor(private readonly prisma: PrismaService) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async proposeMapping(
    samplePayload: Record<string, unknown>,
    targetFields: string[],
    customerId: string,
  ): Promise<FieldMappingProposal> {
    const prompt = `Given this sample vendor payload and target canonical fields, propose field mappings.

Sample payload fields: ${JSON.stringify(Object.keys(samplePayload))}
Sample values: ${JSON.stringify(samplePayload)}
Target fields: ${JSON.stringify(targetFields)}

Respond with JSON:
{
  "mappings": [
    { "sourceField": "vendor_field", "targetField": "canonical_field", "confidence": 0.95, "notes": "optional note" }
  ]
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const usage = response.usage;
      const outputText = response.content[0].type === 'text' ? response.content[0].text : '{}';

      await this.prisma.aiCallLog.create({
        data: {
          customer_id: customerId,
          model: 'claude-sonnet-4-6',
          prompt_tokens: usage.input_tokens,
          completion_tokens: usage.output_tokens,
          cost_usd: (usage.input_tokens / 1000) * 0.003 + (usage.output_tokens / 1000) * 0.015,
          purpose: 'field_mapping',
          input: { samplePayload: samplePayload as unknown as object, targetFields },
          output: JSON.parse(outputText) as object,
        },
      }).catch((e: unknown) => this.logger.error('Failed to log AI call', e));

      return JSON.parse(outputText) as FieldMappingProposal;
    } catch (err) {
      this.logger.error('Field mapping failed, returning empty proposal', err);
      return { mappings: [] };
    }
  }
}
