import { DomainError } from '../topology/errors.js';

export { DomainError };

export class DeviceGatewayError extends DomainError {
  constructor(message: string, code = 'DEVICE_GATEWAY_ERROR') {
    super(code, message);
  }
}

export class UnprovisionedDeviceError extends DeviceGatewayError {
  constructor(message = 'Device is not provisioned on the mTLS bus') {
    super(message, 'UNPROVISIONED_DEVICE');
  }
}

export class CertificateRevokedError extends DeviceGatewayError {
  constructor(message = 'Device certificate has been revoked') {
    super(message, 'CERTIFICATE_REVOKED');
  }
}

export class ClockDriftError extends DeviceGatewayError {
  constructor(message = 'Clock drift exceeds tolerance threshold (2000 ms)') {
    super(message, 'CLOCK_DRIFT_EXCEEDED');
  }
}
