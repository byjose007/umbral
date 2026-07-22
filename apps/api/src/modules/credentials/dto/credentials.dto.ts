import { CredentialType } from '@umbral/core';

export interface IssueCredentialDto {
  personId: string;
  credentialType: CredentialType;
  rawPayload: string; // Will be hashed immediately and never stored in plaintext
  pin?: string;
  duressPin?: string;
  validFrom: string; // ISO string
  validUntil?: string; // ISO string
}

export interface BlockCredentialDto {
  credentialId: string;
  reason: string;
}

export interface GenerateDynamicQRDto {
  credentialId: string;
  personId: string;
  secretKey: string;
  ttlSeconds?: number;
  isSingleUse?: boolean;
}

export interface VerifyCredentialDto {
  rawPayloadOrQRToken: string;
  pin?: string;
  secretKeyForQR?: string;
}
