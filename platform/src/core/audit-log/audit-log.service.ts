import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogParams {
  customer_id: string;
  actor_id: string;
  actor_type: string;
  action: string;
  resource_type: string;
  resource_id: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: AuditLogParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        customer_id: params.customer_id,
        actor_id: params.actor_id,
        actor_type: params.actor_type,
        action: params.action,
        resource_type: params.resource_type,
        resource_id: params.resource_id,
        before: params.before as unknown as object ?? undefined,
        after: params.after as unknown as object ?? undefined,
      },
    });
  }
}
