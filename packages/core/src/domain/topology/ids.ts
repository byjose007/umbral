export type OrganizationId = string & { readonly __brand: 'OrganizationId' };
export type SiteId = string & { readonly __brand: 'SiteId' };
export type ZoneId = string & { readonly __brand: 'ZoneId' };
export type DoorId = string & { readonly __brand: 'DoorId' };
export type ControllerId = string & { readonly __brand: 'ControllerId' };
export type ReaderId = string & { readonly __brand: 'ReaderId' };
export type LockProfileId = string & { readonly __brand: 'LockProfileId' };

export const makeOrganizationId = (id: string): OrganizationId => id as OrganizationId;
export const makeSiteId = (id: string): SiteId => id as SiteId;
export const makeZoneId = (id: string): ZoneId => id as ZoneId;
export const makeDoorId = (id: string): DoorId => id as DoorId;
export const makeControllerId = (id: string): ControllerId => id as ControllerId;
export const makeReaderId = (id: string): ReaderId => id as ReaderId;
export const makeLockProfileId = (id: string): LockProfileId => id as LockProfileId;
