export type UserPassId = string & { readonly __brand: 'UserPassId' };
export type VisitorPassId = string & { readonly __brand: 'VisitorPassId' };

export const makeUserPassId = (id: string): UserPassId => id as UserPassId;
export const makeVisitorPassId = (id: string): VisitorPassId => id as VisitorPassId;
