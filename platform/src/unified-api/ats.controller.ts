import { Controller, Get, Param, Headers, Query } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';

@Controller('unified/ats')
export class AtsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('candidates')
  getCandidates(
    @Headers('x-customer-id') customerId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.prisma.canonicalCandidate.findMany({
      where: { customer_id: customerId },
      take: limit ? parseInt(limit) : 50,
      skip: cursor ? parseInt(cursor) : 0,
      orderBy: { created_at: 'desc' },
    });
  }

  @Get('candidates/:id')
  getCandidate(
    @Headers('x-customer-id') customerId: string,
    @Param('id') id: string,
  ) {
    return this.prisma.canonicalCandidate.findFirst({
      where: { id, customer_id: customerId },
    });
  }

  @Get('applications')
  getApplications(
    @Headers('x-customer-id') customerId: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.canonicalApplication.findMany({
      where: { customer_id: customerId },
      take: limit ? parseInt(limit) : 50,
      orderBy: { created_at: 'desc' },
    });
  }
}
