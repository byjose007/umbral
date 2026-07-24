export type HrisImportBatchId = string & { readonly __brand: 'HrisImportBatchId' };
export type HrisDiscrepancyId = string & { readonly __brand: 'HrisDiscrepancyId' };

export const makeHrisImportBatchId = (id: string): HrisImportBatchId => id as HrisImportBatchId;
export const makeHrisDiscrepancyId = (id: string): HrisDiscrepancyId => id as HrisDiscrepancyId;
