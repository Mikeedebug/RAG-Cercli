import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../core/prisma/prisma.service';

export interface WorkflowAction {
  type: 'create_employee' | 'generate_checklist' | 'notify';
  params?: Record<string, unknown>;
}

export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'neq' | 'exists';
  value?: unknown;
}

@Injectable()
export class WorkflowEngineService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultWorkflows();
  }

  private async seedDefaultWorkflows() {
    const existing = await this.prisma.workflow.findFirst({
      where: { name: 'Default Onboarding', customer_id: 'system' },
    });
    if (existing) return;

    await this.prisma.workflow.create({
      data: {
        customer_id: 'system',
        name: 'Default Onboarding',
        trigger: 'candidate.offer_accepted',
        conditions: [],
        actions: [
          { type: 'create_employee' },
          { type: 'generate_checklist' },
        ],
        field_mapping: {},
        enabled: true,
        version: 1,
      },
    });
    this.logger.log('Seeded default onboarding workflow');
  }

  @OnEvent('candidate.offer_accepted')
  async handleOfferAccepted(payload: Record<string, unknown>) {
    this.logger.log(`Handling offer_accepted event`);
    await this.runWorkflowsForEvent('candidate.offer_accepted', payload);
  }

  @OnEvent('candidate.hired')
  async handleHired(payload: Record<string, unknown>) {
    this.logger.log(`Handling hired event`);
    await this.runWorkflowsForEvent('candidate.hired', payload);
  }

  async runWorkflowsForEvent(eventType: string, payload: Record<string, unknown>) {
    const customerId = (payload['customerId'] as string) ?? 'system';

    const workflows = await this.prisma.workflow.findMany({
      where: {
        trigger: eventType,
        enabled: true,
        customer_id: { in: [customerId, 'system'] },
      },
    });

    for (const workflow of workflows) {
      const conditions = workflow.conditions as unknown as WorkflowCondition[];
      if (!this.evaluateConditions(conditions, payload)) continue;

      const actions = workflow.actions as unknown as WorkflowAction[];
      this.logger.log(`Executing workflow "${workflow.name}" (${actions.length} actions)`);

      // Emit event for each action — actual execution happens in OnboardingService
      for (const action of actions) {
        this.logger.log(`Action: ${action.type}`);
        // Actions are handled by domain services listening to events
      }
    }
  }

  private evaluateConditions(
    conditions: WorkflowCondition[],
    payload: Record<string, unknown>,
  ): boolean {
    for (const cond of conditions) {
      const value = payload[cond.field];
      if (cond.operator === 'eq' && value !== cond.value) return false;
      if (cond.operator === 'neq' && value === cond.value) return false;
      if (cond.operator === 'exists' && value == null) return false;
    }
    return true;
  }

  async createWorkflow(dto: {
    customer_id: string;
    name: string;
    trigger: string;
    conditions: WorkflowCondition[];
    actions: WorkflowAction[];
    field_mapping?: Record<string, string>;
  }) {
    return this.prisma.workflow.create({
      data: {
        customer_id: dto.customer_id,
        name: dto.name,
        trigger: dto.trigger,
        conditions: dto.conditions as object[],
        actions: dto.actions as object[],
        field_mapping: (dto.field_mapping ?? {}) as object,
        enabled: true,
        version: 1,
      },
    });
  }
}
