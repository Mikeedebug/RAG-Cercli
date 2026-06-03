import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Headers,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get(':employee_id')
  getOnboarding(
    @Headers('x-customer-id') customerId: string,
    @Param('employee_id') employeeId: string,
  ) {
    return this.service.getOnboarding(customerId, employeeId);
  }

  @Patch(':employee_id/checklist/:item_key')
  updateChecklistItem(
    @Headers('x-customer-id') customerId: string,
    @Headers('x-actor-id') actorId: string,
    @Param('employee_id') employeeId: string,
    @Param('item_key') itemKey: string,
    @Body() body: { status: 'verified' | 'rejected'; notes?: string },
  ) {
    return this.service.updateChecklistItem(
      customerId,
      employeeId,
      itemKey,
      body.status,
      actorId ?? 'unknown',
      body.notes,
    );
  }

  @Post(':employee_id/documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Headers('x-customer-id') customerId: string,
    @Param('employee_id') employeeId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('expected_type') expectedType: string,
  ) {
    return this.service.uploadDocument(
      customerId,
      employeeId,
      file.buffer,
      file.mimetype,
      expectedType ?? 'identity_document',
    );
  }
}
