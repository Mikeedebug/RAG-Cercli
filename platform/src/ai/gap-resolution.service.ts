import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../core/prisma/prisma.service';
import { CanonicalCandidate } from '../canonical/models/candidate.model';
import { CanonicalApplication } from '../canonical/models/application.model';

export interface GapResolutionResult {
  resolved: Record<string, unknown>;
  flaggedForCollection: string[];
  confidence: number;
}

@Injectable()
export class AiGapResolutionService {
  private readonly logger = new Logger(AiGapResolutionService.name);
  private readonly anthropic: Anthropic;

  constructor(private readonly prisma: PrismaService) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async resolveGaps(
    candidate: CanonicalCandidate,
    application: CanonicalApplication,
    requiredFields: string[],
    customerId: string,
  ): Promise<GapResolutionResult> {
    const missingFields = requiredFields.filter((f) => {
      const val = (candidate as unknown as Record<string, unknown>)[f] ?? (application as unknown as Record<string, unknown>)[f];
      return val == null || val === '';
    });

    if (missingFields.length === 0) {
      return { resolved: {}, flaggedForCollection: [], confidence: 1.0 };
    }

    const prompt = `You are an HR data assistant. Given the following candidate and application data, 
infer the values for any missing required fields if possible, or flag them for manual collection.

Candidate data: ${JSON.stringify({ ...candidate, remote_data: undefined })}
Application data: ${JSON.stringify({ ...application, remote_data: undefined })}

Missing required fields: ${missingFields.join(', ')}

Respond with a JSON object with two keys:
- "resolved": object of field_name -> inferred_value for fields you can confidently infer
- "flagged": array of field names that require manual collection
- "confidence": number 0-1 representing overall confidence

Only respond with valid JSON, no explanation.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const usage = response.usage;
      const outputText = response.content[0].type === 'text' ? response.content[0].text : '{}';

      await this.logAiCall(customerId, 'claude-sonnet-4-5', usage.input_tokens, usage.output_tokens, 'gap_resolution', { candidate, application, requiredFields }, JSON.parse(outputText));

      const parsed = JSON.parse(outputText) as { resolved?: Record<string, unknown>; flagged?: string[]; confidence?: number };
      return {
        resolved: parsed.resolved ?? {},
        flaggedForCollection: parsed.flagged ?? missingFields,
        confidence: parsed.confidence ?? 0.5,
      };
    } catch (err) {
      this.logger.error('AI gap resolution failed, degrading gracefully', err);
      return {
        resolved: {},
        flaggedForCollection: missingFields,
        confidence: 0,
      };
    }
  }

  private async logAiCall(
    customerId: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    purpose: string,
    input: unknown,
    output: unknown,
  ) {
    const costPer1kInput = 0.003;
    const costPer1kOutput = 0.015;
    const costUsd = (promptTokens / 1000) * costPer1kInput + (completionTokens / 1000) * costPer1kOutput;

    await this.prisma.aiCallLog.create({
      data: {
        customer_id: customerId,
        model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cost_usd: costUsd,
        purpose,
        input: input as object,
        output: output as object,
      },
    }).catch((e: unknown) => this.logger.error('Failed to log AI call', e));
  }
}
