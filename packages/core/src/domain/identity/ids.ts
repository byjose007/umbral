export type PersonId = string & { readonly __brand: 'PersonId' };
export type EmploymentPeriodId = string & { readonly __brand: 'EmploymentPeriodId' };
export type AbsenceId = string & { readonly __brand: 'AbsenceId' };
export type DocumentId = string & { readonly __brand: 'DocumentId' };

export const makePersonId = (id: string): PersonId => id as PersonId;
export const makeEmploymentPeriodId = (id: string): EmploymentPeriodId => id as EmploymentPeriodId;
export const makeAbsenceId = (id: string): AbsenceId => id as AbsenceId;
export const makeDocumentId = (id: string): DocumentId => id as DocumentId;
