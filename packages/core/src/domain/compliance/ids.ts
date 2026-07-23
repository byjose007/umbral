export type RetentionPolicyId = string & { readonly __brand: 'RetentionPolicyId' };
export type PiiAuditLogId = string & { readonly __brand: 'PiiAuditLogId' };
export type PrivacyNoticeId = string & { readonly __brand: 'PrivacyNoticeId' };
export type PrivacyConsentId = string & { readonly __brand: 'PrivacyConsentId' };

export const makeRetentionPolicyId = (id: string): RetentionPolicyId => id as RetentionPolicyId;
export const makePiiAuditLogId = (id: string): PiiAuditLogId => id as PiiAuditLogId;
export const makePrivacyNoticeId = (id: string): PrivacyNoticeId => id as PrivacyNoticeId;
export const makePrivacyConsentId = (id: string): PrivacyConsentId => id as PrivacyConsentId;

export const createRetentionPolicyId = makeRetentionPolicyId;
export const createPiiAuditLogId = makePiiAuditLogId;
export const createPrivacyNoticeId = makePrivacyNoticeId;
export const createPrivacyConsentId = makePrivacyConsentId;
