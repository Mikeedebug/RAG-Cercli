import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  Query,
} from '@nestjs/common';
import { LinkedAccountsService, LinkAccountDto } from './linked-accounts.service';

@Controller('linked-accounts')
export class LinkedAccountsController {
  constructor(private readonly service: LinkedAccountsService) {}

  @Post('link')
  startLink(
    @Headers('x-customer-id') customerId: string,
    @Body() dto: LinkAccountDto,
  ) {
    return this.service.startLink(customerId, dto);
  }

  @Get('callback')
  handleCallback(
    @Query('vendor') vendor: string,
    @Query('code') code: string,
    @Query('redirect_uri') redirectUri: string,
  ) {
    return this.service.handleCallback(vendor, code, redirectUri);
  }

  @Get()
  list(@Headers('x-customer-id') customerId: string) {
    return this.service.listForCustomer(customerId);
  }

  @Delete(':id')
  disconnect(
    @Headers('x-customer-id') customerId: string,
    @Param('id') id: string,
  ) {
    return this.service.disconnect(customerId, id);
  }
}
