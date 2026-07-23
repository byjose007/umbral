import { ApplicantType, DocumentType } from '@umbral/core';

export interface SubmitAccessRequestDto {
  siteId: string;
  applicantType: ApplicantType;
  applicantName: string;
  applicantDocumentNumber?: string;
  applicantPersonId?: string;
  requestedAccessLevelId: string;
  reason: string;
  validFrom: string; // ISO string
  validUntil: string; // ISO string
  requiredDocumentTypes?: DocumentType[];
}

export interface AccessRequestDecisionDto {
  actor: string;
  reason?: string;
}

export interface MoveToReviewDto {
  actor: string;
}
