import { LawfulBasis, TargetAudience } from '@umbral/core';

export class CreatePrivacyNoticeDto {
  targetAudience!: TargetAudience;
  version!: string;
  title!: string;
  content!: string;
  lawfulBasis!: LawfulBasis;
  active?: boolean;
}

export class RecordPrivacyConsentDto {
  personId!: string;
  noticeId!: string;
  noticeVersion!: string;
  lawfulBasis!: LawfulBasis;
  ipAddress?: string;
}
