import { ok, err, Result } from 'neverthrow';
import { DomainError, PwaMobileError } from './errors.js';
import { verifyOfflineDynamicQRToken } from './offline-qr-generator.js';

export interface GuardOfflineVerificationResult {
  readonly valid: boolean;
  readonly personId?: string;
  readonly reason?: 'REVOKED_IN_CRL' | 'EXPIRED_OR_INVALID' | 'OK';
}

export interface GuardOverrideLogProps {
  readonly id: string;
  readonly guardPersonId: string;
  readonly targetPersonId?: string;
  readonly targetDocument?: string;
  readonly doorId: string;
  readonly reason: string;
  readonly action: 'manual_contingency_grant' | 'manual_contingency_deny' | 'identity_unmask_audit';
  readonly createdAt?: Date;
}

export class GuardOverrideLog {
  private constructor(public readonly props: GuardOverrideLogProps) {}

  public static create(props: GuardOverrideLogProps): Result<GuardOverrideLog, DomainError> {
    if (!props.id) {
      return err(new PwaMobileError('Override log ID is required'));
    }
    if (!props.guardPersonId) {
      return err(new PwaMobileError('Guard person ID is required'));
    }
    if (!props.doorId) {
      return err(new PwaMobileError('Door ID is required'));
    }

    return ok(new GuardOverrideLog({
      ...props,
      createdAt: props.createdAt || new Date(),
    }));
  }
}

export interface PseudonymizedAlertProps {
  readonly alertId: string;
  readonly type: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly personId: string;
  readonly pseudonym: string;
  readonly realFullName?: string;
  readonly realDocument?: string;
  readonly zoneId: string;
  readonly isUnmasked?: boolean;
  readonly timestamp: Date;
}

export class PseudonymizedAlert {
  private constructor(private readonly props: PseudonymizedAlertProps) {}

  public static create(props: PseudonymizedAlertProps): Result<PseudonymizedAlert, DomainError> {
    if (!props.alertId) {
      return err(new PwaMobileError('Alert ID is required'));
    }
    return ok(new PseudonymizedAlert({
      ...props,
      isUnmasked: props.isUnmasked ?? false,
    }));
  }

  get alertId(): string { return this.props.alertId; }
  get type(): string { return this.props.type; }
  get severity(): string { return this.props.severity; }
  get personId(): string { return this.props.personId; }
  get pseudonym(): string { return this.props.pseudonym; }
  get zoneId(): string { return this.props.zoneId; }
  get timestamp(): Date { return this.props.timestamp; }

  public getDisplayName(): string {
    return this.props.isUnmasked && this.props.realFullName
      ? this.props.realFullName
      : this.props.pseudonym;
  }

  public getDisplayDocument(): string {
    return this.props.isUnmasked && this.props.realDocument
      ? this.props.realDocument
      : '***-LOPDP-MASKED-***';
  }

  public unmaskWithAudit(guardPersonId: string): { alert: PseudonymizedAlert; auditLog: GuardOverrideLogProps } {
    const unmasked = new PseudonymizedAlert({
      ...this.props,
      isUnmasked: true,
    });

    const auditLog: GuardOverrideLogProps = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      guardPersonId,
      targetPersonId: this.props.personId,
      doorId: this.props.zoneId,
      reason: `LOPDP DP-06 identity unmasked for alert ${this.props.alertId}`,
      action: 'identity_unmask_audit',
      createdAt: new Date(),
    };

    return { alert: unmasked, auditLog };
  }
}

export function verifyGuardQRTokenOffline(
  qrToken: string,
  seedSecret: string,
  crlList: readonly string[],
  nowMs: number = Date.now()
): GuardOfflineVerificationResult {
  const isValidSig = verifyOfflineDynamicQRToken(qrToken, seedSecret, nowMs);
  if (!isValidSig) {
    return { valid: false, reason: 'EXPIRED_OR_INVALID' };
  }

  const parts = qrToken.split('.');
  const personId = parts[1];

  if (personId && crlList.includes(personId)) {
    return { valid: false, personId, reason: 'REVOKED_IN_CRL' };
  }

  return { valid: true, personId, reason: 'OK' };
}
