export type DeviceCertificateId = string & { readonly __brand: 'DeviceCertificateId' };

export const makeDeviceCertificateId = (id: string): DeviceCertificateId => id as DeviceCertificateId;
