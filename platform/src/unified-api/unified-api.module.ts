import { Module } from '@nestjs/common';
import { AtsController } from './ats.controller';
import { HrisController } from './hris.controller';

@Module({
  controllers: [AtsController, HrisController],
})
export class UnifiedApiModule {}
