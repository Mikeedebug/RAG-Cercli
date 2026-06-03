import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../core/prisma/prisma.service';

export interface DocumentVerificationResult {
  valid: boolean;
  documentType?: string;
  extractedName?: string;
  nameMatch: boolean;
  issues: string[];
  confidence: number;
  requiresHumanReview: boolean;
}

@Injectable()
export class AiDocumentVerificationService {
  private readonly logger = new Logger(AiDocumentVerificationService.name);
  private readonly anthropic: Anthropic;

  constructor(private readonly prisma: PrismaService) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async verifyDocument(
    documentBuffer: Buffer,
    mimeType: string,
    expectedType: string,
    candidateName: string,
    customerId: string,
  ): Promise<DocumentVerificationResult> {
    const disclaimer =
      'AI verification assists review. Final right-to-work determination is the responsibility of the human administrator.';

    try {
      const base64 = documentBuffer.toString('base64');

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: `${disclaimer}

Analyze this document image. Expected document type: ${expectedType}. Expected candidate name: ${candidateName}.

Respond with JSON:
{
  "valid": boolean,
  "documentType": string (detected document type),
  "extractedName": string (name found in document),
  "nameMatch": boolean,
  "issues": string[] (list of any issues),
  "confidence": number 0-1
}`,
              },
            ],
          },
        ],
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
          purpose: 'document_verification',
          input: { expectedType, candidateName },
          output: { raw: outputText },
        },
      }).catch((e: unknown) => this.logger.error('Failed to log AI call', e));

      const parsed = JSON.parse(outputText) as DocumentVerificationResult;
      return { ...parsed, requiresHumanReview: !parsed.valid || parsed.confidence < 0.8 };
    } catch (err) {
      this.logger.error('Document verification failed, flagging for human review', err);
      return {
        valid: false,
        nameMatch: false,
        issues: ['AI verification failed — manual review required'],
        confidence: 0,
        requiresHumanReview: true,
      };
    }
  }
}
