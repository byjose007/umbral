import { ok, err, Result } from 'neverthrow';
import { DomainError, MissingRequiredDocumentError } from './errors.js';
import { DocumentType } from '../identity/person-document.entity.js';

export interface RequiredDocumentCheckInput {
  readonly docType: DocumentType;
  readonly expiresAt?: Date | null;
  readonly blocksAccessOnExpiry: boolean;
}

export function assertRequiredDocumentsCurrent(
  documents: ReadonlyArray<RequiredDocumentCheckInput>,
  requiredDocTypes: ReadonlyArray<DocumentType>,
  at: Date = new Date()
): Result<void, DomainError> {
  for (const docType of requiredDocTypes) {
    const matching = documents.filter((d) => d.docType === docType);
    if (matching.length === 0) {
      return err(new MissingRequiredDocumentError(`Missing required document: ${docType}`));
    }

    const hasCurrentDocument = matching.some((doc) => {
      const isExpired = doc.expiresAt != null && at.getTime() > doc.expiresAt.getTime();
      return !(doc.blocksAccessOnExpiry && isExpired);
    });

    if (!hasCurrentDocument) {
      return err(new MissingRequiredDocumentError(`Required document expired: ${docType}`));
    }
  }

  return ok(undefined);
}
