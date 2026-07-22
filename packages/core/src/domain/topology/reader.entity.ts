import { ok, err, Result } from 'neverthrow';
import { DoorId, ReaderId } from './ids.js';
import { DomainError } from './errors.js';

export const ReaderProtocol = {
  OSDP: 'osdp',
  WIEGAND: 'wiegand',
} as const;

export type ReaderProtocol = (typeof ReaderProtocol)[keyof typeof ReaderProtocol];

export interface ReaderProps {
  readonly id: ReaderId;
  readonly doorId: DoorId;
  readonly name: string;
  readonly protocol: ReaderProtocol;
  readonly direction: 'in' | 'out';
  readonly riskAcceptedBy?: string | null;
  readonly riskAcceptedAt?: Date | null;
}

export class Reader {
  private constructor(public readonly props: Required<ReaderProps>) {}

  public static create(props: ReaderProps): Result<Reader, DomainError> {
    if (!props.name || props.name.trim().length === 0) {
      return err(new DomainError('INVALID_READER_NAME', 'Reader name cannot be empty'));
    }

    const riskAcceptedBy = props.riskAcceptedBy?.trim() || null;
    const riskAcceptedAt = props.riskAcceptedAt || null;

    if (props.protocol === ReaderProtocol.WIEGAND && !riskAcceptedBy) {
      return err(
        new DomainError(
          'WIEGAND_RISK_NOT_ACCEPTED',
          'Wiegand protocol requires explicit signed risk acceptance'
        )
      );
    }

    return ok(
      new Reader({
        id: props.id,
        doorId: props.doorId,
        name: props.name.trim(),
        protocol: props.protocol,
        direction: props.direction,
        riskAcceptedBy,
        riskAcceptedAt,
      })
    );
  }

  get id(): ReaderId { return this.props.id; }
  get doorId(): DoorId { return this.props.doorId; }
  get name(): string { return this.props.name; }
  get protocol(): ReaderProtocol { return this.props.protocol; }
  get direction(): 'in' | 'out' { return this.props.direction; }
  get riskAcceptedBy(): string | null { return this.props.riskAcceptedBy; }
  get riskAcceptedAt(): Date | null { return this.props.riskAcceptedAt; }
  get isMigrationMode(): boolean { return this.protocol === ReaderProtocol.WIEGAND; }
}
