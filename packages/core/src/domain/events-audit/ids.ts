export type AccessEventId = string & { readonly __brand: 'AccessEventId' };

export const makeAccessEventId = (id: string): AccessEventId => id as AccessEventId;
