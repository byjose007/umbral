export type MobilePassId = string & { readonly __brand: 'MobilePassId' };
export type MusterSessionId = string & { readonly __brand: 'MusterSessionId' };

export const makeMobilePassId = (id: string): MobilePassId => id as MobilePassId;
export const makeMusterSessionId = (id: string): MusterSessionId => id as MusterSessionId;
