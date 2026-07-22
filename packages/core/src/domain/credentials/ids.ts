export type CredentialId = string & { readonly __brand: 'CredentialId' };

export const makeCredentialId = (id: string): CredentialId => id as CredentialId;
