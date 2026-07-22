import { DomainError } from '../topology/errors.js';

export { DomainError };

export class OverlappingEmploymentPeriodError extends DomainError {
  constructor(message = 'Employment period overlaps with an existing active period') {
    super('OVERLAPPING_EMPLOYMENT_PERIOD', message);
  }
}

export class InvalidEmploymentPeriodError extends DomainError {
  constructor(message = 'Invalid employment period dates') {
    super('INVALID_EMPLOYMENT_PERIOD', message);
  }
}

export class InvalidAbsenceError extends DomainError {
  constructor(message = 'Invalid absence dates or parameters') {
    super('INVALID_ABSENCE', message);
  }
}

export class InvalidPersonDocumentError extends DomainError {
  constructor(message = 'Invalid document parameters') {
    super('INVALID_PERSON_DOCUMENT', message);
  }
}

export class InvalidPersonError extends DomainError {
  constructor(message = 'Invalid person parameters') {
    super('INVALID_PERSON', message);
  }
}
