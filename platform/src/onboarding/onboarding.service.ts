import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../core/prisma/prisma.service';
import { ChecklistGeneratorService, ChecklistItem } from './checklist-generator.service';
import { AiGapResolutionService } from '../ai/gap-resolution.service';
import { AiDocumentVerificationService } from '../ai/document-verification.service';
import { AuditLogService } from '../core/audit-log/audit-log.service';
import { HumaansConnector } from '../connectors/humaans/humaans.connector';
import { CanonicalCandidate } from '../canonical/models/candidate.model';
import { CanonicalApplication } from '../canonical/models/application.model';
import { CanonicalEmployee } from '../canonical/models/employee.model';
import { LinkedAccountsService } from '../linked-accounts/linked-accounts.service';

const REQUIRED_EMPLOYEE_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'nationality',
  'work_location',
  'job_title',
];

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly checklistGenerator: ChecklistGeneratorService,
    private readonly aiGapResolution: AiGapResolutionService,
    private readonly aiDocVerification: AiDocumentVerificationService,
    private readonly auditLog: AuditLogService,
    private readonly humaansConnector: HumaansConnector,
    private readonly linkedAccountsService: LinkedAccountsService,
  ) {}

  @OnEvent('candidate.offer_accepted')
  async handleOfferAccepted(payload: {
    customerId: string;
    linkedAccountId: string;
    candidateId: string;
    applicationId: string | null;
    traceId: string;
  }) {
    this.logger.log(`[${payload.traceId}] Starting onboarding for offer_accepted`);
    try {
      await this.runOnboardingFlow(
        payload.customerId,
        payload.linkedAccountId,
        payload.candidateId,
        payload.applicationId,
        payload.traceId,
      );
    } catch (err) {
      this.logger.error(`[${payload.traceId}] Onboarding flow failed`, err);
    }
  }

  async runOnboardingFlow(
    customerId: string,
    linkedAccountId: string,
    candidateId: string,
    applicationId: string | null,
    traceId: string,
  ) {
    const candidate = await this.prisma.canonicalCandidate.findFirst({
      where: { id: candidateId, customer_id: customerId },
    });
    if (!candidate) {
      this.logger.warn(`[${traceId}] Candidate not found: ${candidateId}`);
      return;
    }

    const application = applicationId
      ? await this.prisma.canonicalApplication.findFirst({
          where: { id: applicationId, customer_id: customerId },
        })
      : await this.prisma.canonicalApplication.findFirst({
          where: { candidate_id: candidate.id, customer_id: customerId },
        });

    // AI gap resolution
    const gapResult = await this.aiGapResolution.resolveGaps(
      candidate as unknown as CanonicalCandidate,
      (application ?? {}) as unknown as CanonicalApplication,
      REQUIRED_EMPLOYEE_FIELDS,
      customerId,
    );

    // Build employee draft
    const employeeDraft: Partial<CanonicalEmployee> = {
      customer_id: customerId,
      linked_account_id: linkedAccountId,
      first_name: candidate.first_name ?? (gapResult.resolved['first_name'] as string),
      last_name: candidate.last_name ?? (gapResult.resolved['last_name'] as string),
      email: candidate.email ?? (gapResult.resolved['email'] as string),
      phone: candidate.phone ?? (gapResult.resolved['phone'] as string),
      nationality: candidate.nationality ?? (gapResult.resolved['nationality'] as string),
      work_location: application?.work_location ?? (gapResult.resolved['work_location'] as string),
      job_title: application?.job_title ?? (gapResult.resolved['job_title'] as string),
      status: 'pending',
      remote_data: {},
      custom_fields: {
        ai_gaps_flagged: gapResult.flaggedForCollection,
        ai_confidence: gapResult.confidence,
      },
    };

    // Find Humaans linked account
    const humaansAccount = await this.prisma.linkedAccount.findFirst({
      where: { customer_id: customerId, vendor: 'humaans', status: 'active' },
    });

    let remoteId: string | undefined;
    if (humaansAccount) {
      try {
        const creds = await this.linkedAccountsService.getDecryptedCredentials(humaansAccount.id);
        const payload = { ...employeeDraft, _api_key: creds.api_key };
        const result = await this.humaansConnector.write('employees', payload, traceId);
        remoteId = result.remote_id;
      } catch (err) {
        this.logger.error(`[${traceId}] Failed to write to Humaans`, err);
      }
    }

    // Persist employee
    const employee = await this.prisma.canonicalEmployee.create({
      data: {
        customer_id: customerId,
        linked_account_id: linkedAccountId,
        remote_id: remoteId,
        first_name: employeeDraft.first_name,
        last_name: employeeDraft.last_name,
        email: employeeDraft.email,
        phone: employeeDraft.phone,
        nationality: employeeDraft.nationality,
        work_location: employeeDraft.work_location,
        job_title: employeeDraft.job_title,
        status: 'pending',
        remote_data: (employeeDraft.remote_data ?? {}) as object,
        custom_fields: (employeeDraft.custom_fields ?? {}) as object,
      },
    });

    this.logger.log(`[${traceId}] Created employee ${employee.id}`);

    // Generate RTW checklist
    const nationality = employee.nationality ?? 'unknown';
    const workLocation = employee.work_location ?? 'unknown';
    const items = this.checklistGenerator.generate(nationality, workLocation);

    await this.prisma.rightToWorkChecklist.create({
      data: {
        employee_id: employee.id,
        customer_id: customerId,
        jurisdiction: workLocation,
        status: 'pending',
        items: items as unknown as object[],
      },
    });

    this.logger.log(`[${traceId}] Generated RTW checklist for employee ${employee.id}`);

    await this.auditLog.record({
      customer_id: customerId,
      actor_id: 'system',
      actor_type: 'system',
      action: 'onboarding.initiated',
      resource_type: 'CanonicalEmployee',
      resource_id: employee.id,
      after: { employee_id: employee.id, trace_id: traceId },
    });

    return employee;
  }

  async getOnboarding(customerId: string, employeeId: string) {
    const employee = await this.prisma.canonicalEmployee.findFirst({
      where: { id: employeeId, customer_id: customerId },
      include: { rtw_checklists: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    return {
      employee,
      checklists: employee.rtw_checklists,
      disclaimer:
        'AI verification assists review. Final right-to-work determination is the responsibility of the human administrator.',
    };
  }

  async updateChecklistItem(
    customerId: string,
    employeeId: string,
    itemKey: string,
    status: 'verified' | 'rejected',
    actorId: string,
    notes?: string,
  ) {
    const checklist = await this.prisma.rightToWorkChecklist.findFirst({
      where: { employee_id: employeeId, customer_id: customerId },
    });
    if (!checklist) throw new NotFoundException('Checklist not found');

    const items = checklist.items as unknown as ChecklistItem[];
    const itemIndex = items.findIndex((i) => i.key === itemKey);
    if (itemIndex === -1) throw new NotFoundException(`Checklist item ${itemKey} not found`);

    const before = { ...items[itemIndex] };
    items[itemIndex] = { ...items[itemIndex], status, notes };

    const allVerified = items.filter((i) => i.required).every((i) => i.status === 'verified');
    const newStatus = allVerified ? 'complete' : 'in_progress';

    await this.prisma.rightToWorkChecklist.update({
      where: { id: checklist.id },
      data: { items: items as unknown as object[], status: newStatus as 'pending' | 'in_progress' | 'complete' | 'blocked' },
    });

    await this.auditLog.record({
      customer_id: customerId,
      actor_id: actorId,
      actor_type: 'admin',
      action: `checklist.item.${status}`,
      resource_type: 'RightToWorkChecklist',
      resource_id: checklist.id,
      before: { item: before },
      after: { item: items[itemIndex] },
    });

    return { success: true };
  }

  async uploadDocument(
    customerId: string,
    employeeId: string,
    documentBuffer: Buffer,
    mimeType: string,
    expectedType: string,
  ) {
    const employee = await this.prisma.canonicalEmployee.findFirst({
      where: { id: employeeId, customer_id: customerId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const candidateName = [employee.first_name, employee.last_name].filter(Boolean).join(' ');
    const result = await this.aiDocVerification.verifyDocument(
      documentBuffer,
      mimeType,
      expectedType,
      candidateName,
      customerId,
    );

    return {
      ...result,
      disclaimer:
        'AI verification assists review. Final right-to-work determination is the responsibility of the human administrator.',
    };
  }
}
