import { ok, err, Result } from 'neverthrow';
import { PrivacyNoticeId, PrivacyConsentId } from './ids.js';
import { DomainError, ComplianceError, InvalidPrivacyNoticeError } from './errors.js';

export type LawfulBasis =
  | 'EMPLOYMENT_CONTRACT'
  | 'CONSENT'
  | 'LEGITIMATE_INTEREST'
  | 'LEGAL_OBLIGATION';

export type TargetAudience = 'EMPLOYEE' | 'VISITOR';

export interface PrivacyNoticeProps {
  readonly id: PrivacyNoticeId;
  readonly targetAudience: TargetAudience;
  readonly version: string;
  readonly title: string;
  readonly content: string;
  readonly lawfulBasis: LawfulBasis;
  readonly active: boolean;
  readonly effectiveDate: Date;
}

export interface PrivacyConsentProps {
  readonly id: PrivacyConsentId;
  readonly personId: string;
  readonly noticeId: PrivacyNoticeId;
  readonly noticeVersion: string;
  readonly lawfulBasis: LawfulBasis;
  readonly acceptedAt: Date;
  readonly ipAddress?: string;
  readonly metadata?: Record<string, unknown>;
}

export class PrivacyNotice {
  private constructor(public readonly props: PrivacyNoticeProps) {}

  public static create(props: PrivacyNoticeProps): Result<PrivacyNotice, DomainError> {
    if (!props.id) {
      return err(new InvalidPrivacyNoticeError('Privacy notice ID is required'));
    }
    if (!props.title || props.title.trim().length === 0) {
      return err(new InvalidPrivacyNoticeError('Title is required'));
    }
    if (!props.content || props.content.trim().length === 0) {
      return err(new InvalidPrivacyNoticeError('Content is required'));
    }
    if (!props.version) {
      return err(new InvalidPrivacyNoticeError('Version is required'));
    }

    return ok(new PrivacyNotice(props));
  }

  get id(): PrivacyNoticeId { return this.props.id; }
  get targetAudience(): TargetAudience { return this.props.targetAudience; }
  get version(): string { return this.props.version; }
  get title(): string { return this.props.title; }
  get content(): string { return this.props.content; }
  get lawfulBasis(): LawfulBasis { return this.props.lawfulBasis; }
  get active(): boolean { return this.props.active; }
  get effectiveDate(): Date { return this.props.effectiveDate; }
}

export class PrivacyConsent {
  private constructor(public readonly props: PrivacyConsentProps) {}

  public static record(props: PrivacyConsentProps): Result<PrivacyConsent, DomainError> {
    if (!props.id) {
      return err(new ComplianceError('Privacy consent ID is required'));
    }
    if (!props.personId) {
      return err(new ComplianceError('Person ID is required for consent'));
    }
    if (!props.noticeId) {
      return err(new ComplianceError('Notice ID is required for consent'));
    }

    return ok(new PrivacyConsent({
      ...props,
      metadata: props.metadata ?? {},
    }));
  }

  get id(): PrivacyConsentId { return this.props.id; }
  get personId(): string { return this.props.personId; }
  get noticeId(): PrivacyNoticeId { return this.props.noticeId; }
  get noticeVersion(): string { return this.props.noticeVersion; }
  get lawfulBasis(): LawfulBasis { return this.props.lawfulBasis; }
  get acceptedAt(): Date { return this.props.acceptedAt; }
  get ipAddress(): string | undefined { return this.props.ipAddress; }
  get metadata(): Record<string, unknown> { return this.props.metadata ?? {}; }
}
