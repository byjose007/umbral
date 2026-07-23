import { VisitorPassId, makeVisitorPassId } from './ids.js';
import { VisitorPassExpiredError } from './errors.js';
import { generateVisitorPassToken } from './user-pass-generator.js';

export interface VisitorPassProps {
  id: VisitorPassId;
  issuedByPersonId: string;
  visitorName: string;
  visitorEmail?: string;
  validFrom: Date;
  validTo: Date;
  maxUses: number;
  usedCount: number;
  shareUrl?: string;
  createdAt: Date;
}

/**
 * Visitor Guest Pass entity.
 * Represents a time-limited, use-limited QR pass that an employee can issue
 * and share via WhatsApp or Email to grant a visitor temporary building access.
 */
export class VisitorPass {
  readonly id: VisitorPassId;
  readonly issuedByPersonId: string;
  readonly visitorName: string;
  readonly visitorEmail?: string;
  readonly validFrom: Date;
  readonly validTo: Date;
  readonly maxUses: number;
  private _usedCount: number;
  readonly shareUrl?: string;
  readonly createdAt: Date;

  private constructor(props: VisitorPassProps) {
    this.id = props.id;
    this.issuedByPersonId = props.issuedByPersonId;
    this.visitorName = props.visitorName;
    this.visitorEmail = props.visitorEmail;
    this.validFrom = props.validFrom;
    this.validTo = props.validTo;
    this.maxUses = props.maxUses;
    this._usedCount = props.usedCount;
    this.shareUrl = props.shareUrl;
    this.createdAt = props.createdAt;
  }

  static create(
    issuedByPersonId: string,
    visitorName: string,
    validFrom: Date,
    validTo: Date,
    maxUses: number,
    visitorEmail?: string,
  ): VisitorPass {
    return new VisitorPass({
      id: makeVisitorPassId(crypto.randomUUID()),
      issuedByPersonId,
      visitorName,
      visitorEmail,
      validFrom,
      validTo,
      maxUses,
      usedCount: 0,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: VisitorPassProps): VisitorPass {
    return new VisitorPass(props);
  }

  get usedCount(): number {
    return this._usedCount;
  }

  get isExpired(): boolean {
    return new Date() > this.validTo;
  }

  get isExhausted(): boolean {
    return this._usedCount >= this.maxUses;
  }

  get status(): 'active' | 'used' | 'expired' {
    if (this.isExpired) return 'expired';
    if (this.isExhausted) return 'used';
    return 'active';
  }

  /**
   * Generates the signed QR token for this visitor pass using the provided seed.
   * Throws VisitorPassExpiredError if the pass is no longer valid.
   */
  generateToken(seedSecret: string): string {
    if (this.isExpired || this.isExhausted) {
      throw new VisitorPassExpiredError();
    }
    const result = generateVisitorPassToken(
      seedSecret,
      this.id,
      this.validFrom,
      this.validTo,
      this.maxUses,
    );
    return result.token;
  }

  recordUse(): void {
    if (this.isExpired || this.isExhausted) {
      throw new VisitorPassExpiredError();
    }
    this._usedCount += 1;
  }
}
