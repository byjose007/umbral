export type AccessRequestId = string & { readonly __brand: 'AccessRequestId' };

export const makeAccessRequestId = (id: string): AccessRequestId => id as AccessRequestId;
