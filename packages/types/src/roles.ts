export enum RoleStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  PAUSED = "PAUSED",
  CLOSED = "CLOSED",
}

export enum EmploymentType {
  FULL_TIME = "FULL_TIME",
  PART_TIME = "PART_TIME",
  CONTRACT = "CONTRACT",
  INTERNSHIP = "INTERNSHIP",
  TEMPORARY = "TEMPORARY",
  FREELANCE = "FREELANCE",
}

export enum PipelineStageType {
  SOURCED = "SOURCED",
  APPLIED = "APPLIED",
  SCREENING = "SCREENING",
  INTERVIEW = "INTERVIEW",
  ASSESSMENT = "ASSESSMENT",
  OFFER = "OFFER",
  HIRED = "HIRED",
  REJECTED = "REJECTED",
  WITHDRAWN = "WITHDRAWN",
}

export interface PipelineStage {
  id: string;
  name: string;
  type: PipelineStageType;
  order: number;
  automations?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineTemplate {
  id: string;
  organizationId: string;
  name: string;
  stages: PipelineStage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  status: RoleStatus;
  employmentType: EmploymentType;
  location?: string;
  remote: boolean;
  department?: string;
  hiringManagerId?: string;
  recruiterIds: string[];
  pipelineTemplateId?: string;
  pipeline: PipelineStage[];
  openedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
