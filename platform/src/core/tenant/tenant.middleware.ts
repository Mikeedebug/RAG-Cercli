import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const customerId = req.headers['x-customer-id'];
    if (!customerId || typeof customerId !== 'string') {
      throw new BadRequestException('X-Customer-Id header is required');
    }
    (req as Request & { customerId: string }).customerId = customerId;
    next();
  }
}
