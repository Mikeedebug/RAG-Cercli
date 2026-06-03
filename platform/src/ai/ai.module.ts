import { Module } from '@nestjs/common';
import { AiGapResolutionService } from './gap-resolution.service';
import { AiDocumentVerificationService } from './document-verification.service';
import { AiFieldMappingService } from './field-mapping.service';

@Module({
  providers: [AiGapResolutionService, AiDocumentVerificationService, AiFieldMappingService],
  exports: [AiGapResolutionService, AiDocumentVerificationService, AiFieldMappingService],
})
export class AiModule {}
