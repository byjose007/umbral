import { ok, err, Result } from 'neverthrow';
import { PiiAuditLogId } from './ids.js';
import { DomainError, ComplianceError, UnauthorizedPiiAccessError } from './errors.js';

export type PiiAccessType =
  | 'IDENTITY_REVEAL'
  | 'TRAJECTORY_QUERY'
  | 'ARCO_EXPORT'
  | 'ARCO_RECTIFY'
  | 'ARCO_ANONYMIZE';

export interface PiiAccessAuditProps {
  readonly id: PiiAuditLogId;
  readonly operatorId: string;
  readonly targetPersonId: string;
  readonly accessType: PiiAccessType;
  readonly justification: string;
  readonly timestamp: Date;
  readonly ipAddress?: string;
  readonly metadata?: Record<string, unknown>;
}

export class PiiAccessAuditLog {
  private constructor(public readonly props: PiiAccessAuditProps) {}

  public static create(props: PiiAccessAuditProps): Result<PiiAccessAuditLog, DomainError> {
    if (!props.id) {
      return err(new ComplianceError('PII audit log ID is required'));
    }
    if (!props.operatorId) {
      return err(new ComplianceError('Operator ID is required for PII audit log'));
    }
    if (!props.targetPersonId) {
      return err(new ComplianceError('Target person ID is required for PII audit log'));
    }
    if (!props.justification || props.justification.trim().length === 0) {
      return err(new ComplianceError('Justification is mandatory for PII access'));
    }

    return ok(new PiiAccessAuditLog({
      ...props,
      metadata: props.metadata ?? {},
    }));
  }

  get id(): PiiAuditLogId { return this.props.id; }
  get operatorId(): string { return this.props.operatorId; }
  get targetPersonId(): string { return this.props.targetPersonId; }
  get accessType(): PiiAccessType { return this.props.accessType; }
  get justification(): string { return this.props.justification; }
  get timestamp(): Date { return this.props.timestamp; }
  get ipAddress(): string | undefined { return this.props.ipAddress; }
  get metadata(): Record<string, unknown> { return this.props.metadata ?? {}; }

  public static authorizeAccess(
    operatorId: string,
    operatorRoles: string[],
    accessType: PiiAccessType,
    resourceName: string
  ): Result<boolean, DomainError> {
    const isComplianceAdmin = operatorRoles.includes('compliance_officer') || operatorRoles.includes('admin');
    const isSecuritySupervisor = operatorRoles.includes('security_supervisor');
    const isGaritaOperator = operatorRoles.includes('garita_operator');

    if (accessType === 'TRAJECTORY_QUERY' || accessType === 'IDENTITY_REVEAL') {
      if (isGaritaOperator && !isComplianceAdmin && !isSecuritySupervisor) {
        return err(new UnauthorizedPiiAccessError(operatorId, `${accessType}:${resourceName}`));
      }
    }

    if (accessType.startsWith('ARCO_') && !isComplianceAdmin) {
      return err(new UnauthorizedPiiAccessError(operatorId, `${accessType}:${resourceName}`));
    }

    return ok(true);
  }
}
