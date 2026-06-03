import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { ChecklistGeneratorService } from './checklist-generator.service';
import { AiModule } from '../ai/ai.module';
import { AuditLogModule } from '../core/audit-log/audit-log.module';
import { ConnectorsModule } from '../connectors/connectors.module';
import { LinkedAccountsModule } from '../linked-accounts/linked-accounts.module';

@Module({
  imports: [AiModule, AuditLogModule, ConnectorsModule, LinkedAccountsModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, ChecklistGeneratorService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
