import { ok, err, Result } from 'neverthrow';
import { AccessEventId } from './ids.js';
import { EventType, EventSeverity, getEventSeverity } from './taxonomy.js';
import { DomainError, EventsAuditError } from './errors.js';
import { SiteId, DoorId, ControllerId } from '../topology/ids.js';
import { PersonId } from '../identity/ids.js';
import { CredentialId } from '../credentials/ids.js';
import { computeEventHash, GENESIS_HASH } from './hash-chain.js';

export interface AccessEventProps {
  readonly id: AccessEventId;
  readonly chainPartition: string;
  readonly sequenceNumber: number;
  readonly previousHash: string;
  readonly currentHash: string;
  readonly eventType: EventType;
  readonly severity?: EventSeverity;
  readonly siteId: SiteId;
  readonly doorId?: DoorId | null;
  readonly controllerId?: ControllerId | null;
  readonly personId?: PersonId | null;
  readonly credentialId?: CredentialId | null;
  readonly direction?: 'in' | 'out' | null;
  readonly reasonCode?: string | null;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
}

export class AccessEvent {
  private constructor(public readonly props: AccessEventProps) {}

  public static create(props: AccessEventProps): Result<AccessEvent, DomainError> {
    if (!props.id) {
      return err(new EventsAuditError('Access event ID is required'));
    }
    if (!props.chainPartition) {
      return err(new EventsAuditError('Chain partition is required'));
    }
    if (props.sequenceNumber < 1) {
      return err(new EventsAuditError('Sequence number must be >= 1'));
    }

    const severity = props.severity ?? getEventSeverity(props.eventType);

    return ok(new AccessEvent({
      ...props,
      severity,
      doorId: props.doorId ?? null,
      controllerId: props.controllerId ?? null,
      personId: props.personId ?? null,
      credentialId: props.credentialId ?? null,
      direction: props.direction ?? null,
      reasonCode: props.reasonCode ?? null,
      details: props.details ?? {},
    }));
  }

  get id(): AccessEventId { return this.props.id; }
  get chainPartition(): string { return this.props.chainPartition; }
  get sequenceNumber(): number { return this.props.sequenceNumber; }
  get previousHash(): string { return this.props.previousHash; }
  get currentHash(): string { return this.props.currentHash; }
  get eventType(): EventType { return this.props.eventType; }
  get severity(): EventSeverity { return this.props.severity ?? 'info'; }
  get siteId(): SiteId { return this.props.siteId; }
  get doorId(): DoorId | null { return this.props.doorId ?? null; }
  get controllerId(): ControllerId | null { return this.props.controllerId ?? null; }
  get personId(): PersonId | null { return this.props.personId ?? null; }
  get credentialId(): CredentialId | null { return this.props.credentialId ?? null; }
  get direction(): 'in' | 'out' | null { return this.props.direction ?? null; }
  get reasonCode(): string | null { return this.props.reasonCode ?? null; }
  get timestamp(): Date { return this.props.timestamp; }

  public verifyHash(): boolean {
    const payloadStr = JSON.stringify(this.props.details ?? {});
    const expectedHash = computeEventHash(
      this.props.previousHash,
      this.props.id,
      this.props.timestamp.toISOString(),
      this.props.eventType,
      payloadStr
    );
    return this.props.currentHash === expectedHash;
  }
}
