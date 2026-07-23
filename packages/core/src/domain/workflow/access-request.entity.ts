import { ok, err, Result } from 'neverthrow';
import { AccessRequestId } from './ids.js';
import { DomainError, InvalidAccessRequestError, InvalidAccessRequestTransitionError } from './errors.js';
import { SiteId } from '../topology/ids.js';
import { PersonId } from '../identity/ids.js';
import { DocumentType } from '../identity/person-document.entity.js';
import { AccessLevelId } from '../access-rights/ids.js';

export type ApplicantType = 'provider' | 'visitor';

export type AccessRequestStatus =
  | 'requested'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'expired';

const VALID_TRANSITIONS: Record<AccessRequestStatus, ReadonlyArray<AccessRequestStatus>> = {
  requested: ['in_review', 'rejected'],
  in_review: ['approved', 'rejected'],
  approved: ['active'],
  rejected: [],
  active: ['expired'],
  expired: [],
};

export interface AccessRequestTransitionRecord {
  readonly toStatus: AccessRequestStatus;
  readonly actor: string;
  readonly at: Date;
  readonly reason?: string | null;
}

export interface AccessRequestProps {
  readonly id: AccessRequestId;
  readonly siteId: SiteId;
  readonly applicantType: ApplicantType;
  readonly applicantName: string;
  readonly applicantDocumentNumber?: string | null;
  readonly applicantPersonId?: PersonId | null;
  readonly requestedAccessLevelId: AccessLevelId;
  readonly reason: string;
  readonly validFrom: Date;
  readonly validUntil: Date;
  readonly requiredDocumentTypes?: ReadonlyArray<DocumentType>;
  readonly status?: AccessRequestStatus;
  readonly decidedBy?: string | null;
  readonly decidedAt?: Date | null;
  readonly decisionReason?: string | null;
  readonly history?: ReadonlyArray<AccessRequestTransitionRecord>;
  readonly createdAt?: Date;
}

export class AccessRequest {
  private constructor(public readonly props: Required<AccessRequestProps>) {}

  public static create(props: AccessRequestProps): Result<AccessRequest, DomainError> {
    if (!props.id) {
      return err(new InvalidAccessRequestError('Access request ID is required'));
    }
    if (!props.applicantName || props.applicantName.trim().length === 0) {
      return err(new InvalidAccessRequestError('Applicant name cannot be empty'));
    }
    if (!props.requestedAccessLevelId) {
      return err(new InvalidAccessRequestError('Requested access level is required'));
    }
    if (!props.reason || props.reason.trim().length === 0) {
      return err(new InvalidAccessRequestError('Reason for the request cannot be empty'));
    }
    if (props.validUntil < props.validFrom) {
      return err(new InvalidAccessRequestError('Valid-until date cannot be before valid-from date'));
    }

    return ok(new AccessRequest({
      id: props.id,
      siteId: props.siteId,
      applicantType: props.applicantType,
      applicantName: props.applicantName.trim(),
      applicantDocumentNumber: props.applicantDocumentNumber ?? null,
      applicantPersonId: props.applicantPersonId ?? null,
      requestedAccessLevelId: props.requestedAccessLevelId,
      reason: props.reason.trim(),
      validFrom: props.validFrom,
      validUntil: props.validUntil,
      requiredDocumentTypes: props.requiredDocumentTypes ?? [],
      status: props.status ?? 'requested',
      decidedBy: props.decidedBy ?? null,
      decidedAt: props.decidedAt ?? null,
      decisionReason: props.decisionReason ?? null,
      history: props.history ?? [],
      createdAt: props.createdAt ?? new Date(),
    }));
  }

  get id(): AccessRequestId { return this.props.id; }
  get siteId(): SiteId { return this.props.siteId; }
  get applicantType(): ApplicantType { return this.props.applicantType; }
  get applicantName(): string { return this.props.applicantName; }
  get applicantPersonId(): PersonId | null { return this.props.applicantPersonId; }
  get requestedAccessLevelId(): AccessLevelId { return this.props.requestedAccessLevelId; }
  get validFrom(): Date { return this.props.validFrom; }
  get validUntil(): Date { return this.props.validUntil; }
  get requiredDocumentTypes(): ReadonlyArray<DocumentType> { return this.props.requiredDocumentTypes; }
  get status(): AccessRequestStatus { return this.props.status; }
  get history(): ReadonlyArray<AccessRequestTransitionRecord> { return this.props.history; }

  public canTransitionTo(target: AccessRequestStatus): boolean {
    return VALID_TRANSITIONS[this.props.status].includes(target);
  }

  public transitionTo(
    target: AccessRequestStatus,
    actor: string,
    at: Date = new Date(),
    reason?: string | null
  ): Result<AccessRequest, DomainError> {
    if (!this.canTransitionTo(target)) {
      return err(new InvalidAccessRequestTransitionError(
        `Cannot transition access request from '${this.props.status}' to '${target}'`
      ));
    }

    const isDecision = target === 'approved' || target === 'rejected';

    return ok(new AccessRequest({
      ...this.props,
      status: target,
      decidedBy: isDecision ? actor : this.props.decidedBy,
      decidedAt: isDecision ? at : this.props.decidedAt,
      decisionReason: isDecision ? (reason ?? null) : this.props.decisionReason,
      history: [...this.props.history, { toStatus: target, actor, at, reason: reason ?? null }],
    }));
  }

  public isActiveAt(at: Date = new Date()): boolean {
    return this.props.status === 'active' && at.getTime() <= this.props.validUntil.getTime();
  }
}
