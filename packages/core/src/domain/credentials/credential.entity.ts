import { ok, err, Result } from 'neverthrow';
import { CredentialId } from './ids.js';
import { PersonId } from '../identity/ids.js';
import { DomainError, CredentialError, ProhibitedTechnologyError } from './errors.js';
import { hashPin } from './credential-hash.js';

export type CredentialType =
  | 'mifare_desfire'
  | 'nfc_phone'
  | 'qr_dynamic'
  | 'qr_single_use'
  | 'pin';

export type CredentialStatus = 'active' | 'blocked' | 'expired' | 'revoked';

export interface CredentialProps {
  readonly id: CredentialId;
  readonly personId: PersonId;
  readonly credentialType: CredentialType;
  readonly credentialHash: string;
  readonly pinHash?: string | null;
  readonly duressPinHash?: string | null;
  readonly status: CredentialStatus;
  readonly blockReason?: string | null;
  readonly blockedAt?: Date | null;
  readonly validFrom: Date;
  readonly validUntil?: Date | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export class Credential {
  private constructor(public readonly props: CredentialProps) {}

  public static create(props: CredentialProps): Result<Credential, DomainError> {
    if (!props.id) {
      return err(new CredentialError('Credential ID is required'));
    }
    if (!props.personId) {
      return err(new CredentialError('Person ID is required'));
    }
    if (!props.credentialHash || props.credentialHash.trim().length === 0) {
      return err(new CredentialError('Credential hash is required'));
    }

    const validTypes: CredentialType[] = [
      'mifare_desfire',
      'nfc_phone',
      'qr_dynamic',
      'qr_single_use',
      'pin',
    ];

    if (!validTypes.includes(props.credentialType)) {
      // Check if trying to use prohibited technologies like 125kHz / MIFARE Classic
      if (['wiegand_raw', 'mifare_classic', '125khz', 'em4100'].includes(props.credentialType as string)) {
        return err(new ProhibitedTechnologyError());
      }
      return err(new CredentialError(`Invalid credential type: ${props.credentialType}`));
    }

    if (props.validUntil && props.validUntil < props.validFrom) {
      return err(new CredentialError('Valid until date cannot be before valid from date'));
    }

    return ok(new Credential({
      id: props.id,
      personId: props.personId,
      credentialType: props.credentialType,
      credentialHash: props.credentialHash,
      pinHash: props.pinHash ?? null,
      duressPinHash: props.duressPinHash ?? null,
      status: props.status || 'active',
      blockReason: props.blockReason ?? null,
      blockedAt: props.blockedAt ?? null,
      validFrom: props.validFrom,
      validUntil: props.validUntil ?? null,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    }));
  }

  get id(): CredentialId { return this.props.id; }
  get personId(): PersonId { return this.props.personId; }
  get credentialType(): CredentialType { return this.props.credentialType; }
  get credentialHash(): string { return this.props.credentialHash; }
  get status(): CredentialStatus { return this.props.status; }
  get blockReason(): string | null { return this.props.blockReason ?? null; }
  get blockedAt(): Date | null { return this.props.blockedAt ?? null; }
  get validFrom(): Date { return this.props.validFrom; }
  get validUntil(): Date | null { return this.props.validUntil ?? null; }

  public isActiveAt(at: Date = new Date()): boolean {
    if (this.props.status !== 'active') {
      return false;
    }
    const time = at.getTime();
    if (time < this.validFrom.getTime()) {
      return false;
    }
    if (this.props.validUntil && time > this.props.validUntil.getTime()) {
      return false;
    }
    return true;
  }

  public block(reason: string, at: Date = new Date()): Result<Credential, DomainError> {
    if (!reason || reason.trim().length === 0) {
      return err(new CredentialError('Block reason is required'));
    }
    return ok(new Credential({
      ...this.props,
      status: 'blocked',
      blockReason: reason.trim(),
      blockedAt: at,
      updatedAt: at,
    }));
  }

  public verifyPin(inputPin: string): boolean {
    if (!this.props.pinHash) return false;
    return hashPin(inputPin) === this.props.pinHash;
  }

  public isDuressPin(inputPin: string): boolean {
    if (!this.props.duressPinHash) return false;
    return hashPin(inputPin) === this.props.duressPinHash;
  }
}
