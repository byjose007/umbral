export class LoginUserPassDto {
  /** Person identifier (e.g. employee ID or UUID) */
  personId!: string;
  /** Hashed PIN (client derives PBKDF2 key before sending — never plaintext) */
  pinHash!: string;
}

export class GetUserPassSeedDto {
  personId!: string;
}

export class GetUserAccessHistoryDto {
  personId!: string;
  /** Max number of entries to return (default: 20) */
  limit?: number;
}

export class IssueVisitorPassDto {
  /** Person issuing the pass */
  issuerPersonId!: string;
  visitorName!: string;
  visitorEmail?: string;
  /** ISO 8601 start datetime */
  validFrom!: string;
  /** ISO 8601 end datetime */
  validTo!: string;
  /** Maximum number of uses (default: 1) */
  maxUses?: number;
}

export class GetVisitorPassesDto {
  /** Person who issued the passes */
  issuerPersonId!: string;
  /** Filter by status: 'active' | 'used' | 'expired' | undefined (all) */
  status?: string;
}

export class VerifyUserPassTokenDto {
  /** Raw token string from the scanned QR code */
  token!: string;
  /** Seed secret for this person (resolved server-side) */
  personId!: string;
}

export class RecordVisitorPassUseDto {
  visitorPassId!: string;
}
