export enum CandidateSource {
  MANUAL = "MANUAL",
  IMPORT = "IMPORT",
  REFERRAL = "REFERRAL",
  JOB_BOARD = "JOB_BOARD",
  LINKEDIN = "LINKEDIN",
  SOURCING_CAMPAIGN = "SOURCING_CAMPAIGN",
  AGENCY = "AGENCY",
  CAREERS_PAGE = "CAREERS_PAGE",
  OTHER = "OTHER",
}

export enum GdprStatus {
  PENDING = "PENDING",
  CONSENTED = "CONSENTED",
  WITHDRAWN = "WITHDRAWN",
  LEGITIMATE_INTEREST = "LEGITIMATE_INTEREST",
  EXPIRED = "EXPIRED",
}

export interface ParsedProfile {
  headline?: string;
  summary?: string;
  skills: string[];
  languages: string[];
  education: Array<{
    institution: string;
    degree?: string;
    field?: string;
    startYear?: number;
    endYear?: number;
  }>;
  experience: Array<{
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  urls: string[];
}

export interface Candidate {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  location?: string;
  source: CandidateSource;
  gdprStatus: GdprStatus;
  gdprConsentAt?: Date;
  gdprExpiresAt?: Date;
  doNotContact: boolean;
  doNotContactReason?: string;
  parsedProfile?: ParsedProfile;
  linkedinUrl?: string;
  resumeFileId?: string;
  tags: string[];
  mergedIntoId?: string;
  createdAt: Date;
  updatedAt: Date;
}
