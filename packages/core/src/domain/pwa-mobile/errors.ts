import { DomainError } from '../topology/errors.js';

export { DomainError };

export class PwaMobileError extends DomainError {
  constructor(message: string, code = 'PWA_MOBILE_ERROR') {
    super(code, message);
  }
}

export class OfflineSyncError extends PwaMobileError {
  constructor(message = 'Failed to synchronize offline data buffer') {
    super(message, 'OFFLINE_SYNC_ERROR');
  }
}

export class MusterSessionError extends PwaMobileError {
  constructor(message = 'Invalid muster evacuation session operation') {
    super(message, 'MUSTER_SESSION_ERROR');
  }
}
