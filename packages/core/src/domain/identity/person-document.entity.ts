import { ok, err, Result } from 'neverthrow';
import { DocumentId, PersonId } from './ids.js';
import { DomainError, InvalidPersonDocumentError } from './errors.js';

export type DocumentType = 'safety_cert' | 'medical_exam' | 'insurance_policy' | 'id_card';

export interface PersonDocumentProps {
  readonly id: DocumentId;
  readonly personId: PersonId;
  readonly docType: DocumentType;
  readonly documentNumber: string;
  readonly expiresAt?: Date | null;
  readonly blocksAccessOnExpiry: boolean;
  readonly createdAt?: Date;
}

export class PersonDocument {
  private constructor(public readonly props: PersonDocumentProps) {}

  public static create(props: PersonDocumentProps): Result<PersonDocument, DomainError> {
    if (!props.id) {
      return err(new InvalidPersonDocumentError('Document ID is required'));
    }
    if (!props.personId) {
      return err(new InvalidPersonDocumentError('Person ID is required'));
    }
    if (!props.documentNumber || props.documentNumber.trim().length === 0) {
      return err(new InvalidPersonDocumentError('Document number cannot be empty'));
    }
    if (props.expiresAt && isNaN(props.expiresAt.getTime())) {
      return err(new InvalidPersonDocumentError('Expiration date is invalid'));
    }

    return ok(new PersonDocument({
      id: props.id,
      personId: props.personId,
      docType: props.docType || 'safety_cert',
      documentNumber: props.documentNumber.trim(),
      expiresAt: props.expiresAt ?? null,
      blocksAccessOnExpiry: props.blocksAccessOnExpiry ?? true,
      createdAt: props.createdAt ?? new Date(),
    }));
  }

  get id(): DocumentId { return this.props.id; }
  get personId(): PersonId { return this.props.personId; }
  get docType(): DocumentType { return this.props.docType; }
  get documentNumber(): string { return this.props.documentNumber; }
  get expiresAt(): Date | null { return this.props.expiresAt ?? null; }
  get blocksAccessOnExpiry(): boolean { return this.props.blocksAccessOnExpiry; }

  public isExpiredAt(at: Date): boolean {
    if (!this.expiresAt) return false;
    return at.getTime() > this.expiresAt.getTime();
  }

  public isBlockingAt(at: Date): boolean {
    return this.blocksAccessOnExpiry && this.isExpiredAt(at);
  }
}
