import { ContractType, AbsenceType, DocumentType, PersonType } from '@umbral/core';

export interface CreatePersonDto {
  siteId: string;
  personType: PersonType;
  firstName: string;
  lastName: string;
  nationalId: string;
  externalRef?: string;
  email?: string;
  phone?: string;
}

export interface CreateEmploymentPeriodDto {
  personId: string;
  contractType: ContractType;
  validFrom: string; // ISO string
  validUntil?: string; // ISO string
  jobTitle?: string;
  department?: string;
}

export interface CreateAbsenceDto {
  personId: string;
  absenceType: AbsenceType;
  validFrom: string; // ISO string
  validUntil: string; // ISO string
  blocksAccess?: boolean;
  reason?: string;
}

export interface CreatePersonDocumentDto {
  personId: string;
  docType: DocumentType;
  documentNumber: string;
  expiresAt?: string; // ISO string
  blocksAccessOnExpiry?: boolean;
}

export interface QueryAccessStatusDto {
  personId: string;
  at?: string; // ISO string
}
