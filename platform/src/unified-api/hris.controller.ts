import { Controller, Get, Param, Headers, Query } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';

@Controller('unified/hris')
export class HrisController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('employees')
  getEmployees(
    @Headers('x-customer-id') customerId: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.canonicalEmployee.findMany({
      where: { customer_id: customerId },
      take: limit ? parseInt(limit) : 50,
      orderBy: { created_at: 'desc' },
    });
  }

  @Get('employees/:id')
  getEmployee(
    @Headers('x-customer-id') customerId: string,
    @Param('id') id: string,
  ) {
    return this.prisma.canonicalEmployee.findFirst({
      where: { id, customer_id: customerId },
    });
  }
}
