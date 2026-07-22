import { ok, err, Result } from 'neverthrow';
import { LockProfileId } from './ids.js';
import { DomainError } from './errors.js';

export const LockActuationMode = {
  PULSE: 'pulse',
  MAINTAINED: 'maintained',
  TOGGLE: 'toggle',
} as const;

export type LockActuationMode = (typeof LockActuationMode)[keyof typeof LockActuationMode];

export const FailState = {
  FAIL_SAFE: 'fail_safe',
  FAIL_SECURE: 'fail_secure',
} as const;

export type FailState = (typeof FailState)[keyof typeof FailState];

export interface LockProfileProps {
  readonly id: LockProfileId;
  readonly name: string;
  readonly actuationMode: LockActuationMode;
  readonly pulseDurationMs: number;
  readonly unlockWindowMs?: number | null;
  readonly failState: FailState;
  readonly relayInverted?: boolean;
  readonly hasDoorPositionSensor: boolean;
  readonly hasRexInput?: boolean;
  readonly hasTamperInput?: boolean;
  readonly heldOpenTimeoutSec: number | null;
  readonly heldOpenPrewarnSec?: number | null;
  readonly rexGraceSec?: number;
  readonly isEgressRoute: boolean;
  readonly releasesOnFire: boolean;
}

export class LockProfile {
  private constructor(public readonly props: Required<LockProfileProps>) {}

  public static create(props: LockProfileProps): Result<LockProfile, DomainError> {
    const fullProps: Required<LockProfileProps> = {
      id: props.id,
      name: props.name,
      actuationMode: props.actuationMode,
      pulseDurationMs: props.pulseDurationMs,
      unlockWindowMs: props.unlockWindowMs ?? null,
      failState: props.failState,
      relayInverted: props.relayInverted ?? false,
      hasDoorPositionSensor: props.hasDoorPositionSensor,
      hasRexInput: props.hasRexInput ?? false,
      hasTamperInput: props.hasTamperInput ?? false,
      heldOpenTimeoutSec: props.heldOpenTimeoutSec,
      heldOpenPrewarnSec: props.heldOpenPrewarnSec ?? null,
      rexGraceSec: props.rexGraceSec ?? 8,
      isEgressRoute: props.isEgressRoute,
      releasesOnFire: props.releasesOnFire,
    };

    if (fullProps.isEgressRoute && fullProps.failState === FailState.FAIL_SECURE) {
      return err(
        new DomainError(
          'LIFE_SAFETY_INVARIANT_VIOLATION',
          'Egress route door must be fail-safe, cannot be fail-secure',
          { isEgressRoute: true, failState: fullProps.failState }
        )
      );
    }

    if (fullProps.isEgressRoute && !fullProps.releasesOnFire) {
      return err(
        new DomainError(
          'LIFE_SAFETY_INVARIANT_VIOLATION',
          'Egress route door must release on fire',
          { isEgressRoute: true, releasesOnFire: false }
        )
      );
    }

    if (!fullProps.hasDoorPositionSensor && fullProps.heldOpenTimeoutSec !== null) {
      return err(
        new DomainError(
          'DPS_REQUIRED_FOR_HELD_OPEN_ALERT',
          'Held open alert requires a door position sensor (DPS)',
          { hasDoorPositionSensor: false, heldOpenTimeoutSec: fullProps.heldOpenTimeoutSec }
        )
      );
    }

    if (fullProps.actuationMode === LockActuationMode.PULSE) {
      if (fullProps.pulseDurationMs < 100 || fullProps.pulseDurationMs > 10000) {
        return err(
          new DomainError(
            'INVALID_PULSE_DURATION',
            'Pulse duration must be between 100ms and 10000ms',
            { pulseDurationMs: fullProps.pulseDurationMs }
          )
        );
      }
    }

    return ok(new LockProfile(fullProps));
  }

  get id(): LockProfileId { return this.props.id; }
  get name(): string { return this.props.name; }
  get actuationMode(): LockActuationMode { return this.props.actuationMode; }
  get pulseDurationMs(): number { return this.props.pulseDurationMs; }
  get unlockWindowMs(): number | null { return this.props.unlockWindowMs; }
  get failState(): FailState { return this.props.failState; }
  get relayInverted(): boolean { return this.props.relayInverted; }
  get hasDoorPositionSensor(): boolean { return this.props.hasDoorPositionSensor; }
  get hasRexInput(): boolean { return this.props.hasRexInput; }
  get hasTamperInput(): boolean { return this.props.hasTamperInput; }
  get heldOpenTimeoutSec(): number | null { return this.props.heldOpenTimeoutSec; }
  get heldOpenPrewarnSec(): number | null { return this.props.heldOpenPrewarnSec; }
  get rexGraceSec(): number { return this.props.rexGraceSec; }
  get isEgressRoute(): boolean { return this.props.isEgressRoute; }
  get releasesOnFire(): boolean { return this.props.releasesOnFire; }
}
