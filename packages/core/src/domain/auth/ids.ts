export type OperatorId = string & { readonly __brand: 'OperatorId' };
export type RefreshTokenId = string & { readonly __brand: 'RefreshTokenId' };

export const makeOperatorId = (id: string): OperatorId => id as OperatorId;
export const makeRefreshTokenId = (id: string): RefreshTokenId => id as RefreshTokenId;
