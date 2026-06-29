export enum ApplicationStatus {
  ACTIVE = "ACTIVE",
  REJECTED = "REJECTED",
  WITHDRAWN = "WITHDRAWN",
  HIRED = "HIRED",
}

export interface StageTransition {
  id: string;
  applicationId: string;
  fromStageId?: string;
  toStageId: string;
  triggeredBy: string;
  reason?: string;
  occurredAt: Date;
}

export interface Application {
  id: string;
  organizationId: string;
  roleId: string;
  candidateId: string;
  status: ApplicationStatus;
  currentStageId: string;
  source?: string;
  coverLetter?: string;
  rejectionReason?: string;
  rejectedAt?: Date;
  withdrawnAt?: Date;
  hiredAt?: Date;
  transitions: StageTransition[];
  scorecardIds: string[];
  interviewIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
