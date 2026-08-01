import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const LoginUserPassSchema = z.object({
  /** Person identifier (e.g. employee ID or UUID) */
  personId: z.string().min(1),
  /** Hashed PIN (client derives PBKDF2/SHA-256 key before sending — never plaintext) */
  pinHash: z.string().min(1),
});
export class LoginUserPassDto extends createZodDto(LoginUserPassSchema) {}

export const GetUserPassSeedSchema = z.object({
  personId: z.string().min(1),
});
export class GetUserPassSeedDto extends createZodDto(GetUserPassSeedSchema) {}

export const GetUserAccessHistorySchema = z.object({
  personId: z.string().min(1),
  /** Max number of entries to return (default: 20) */
  limit: z.number().int().positive().optional(),
});
export class GetUserAccessHistoryDto extends createZodDto(GetUserAccessHistorySchema) {}

export const IssueVisitorPassSchema = z.object({
  /** Person issuing the pass */
  issuerPersonId: z.string().min(1),
  visitorName: z.string().min(1).max(128),
  visitorEmail: z.string().email().optional(),
  /** ISO 8601 start datetime */
  validFrom: z.string().min(1),
  /** ISO 8601 end datetime */
  validTo: z.string().min(1),
  /** Maximum number of uses (default: 1) */
  maxUses: z.number().int().positive().optional(),
});
export class IssueVisitorPassDto extends createZodDto(IssueVisitorPassSchema) {}

export const GetVisitorPassesSchema = z.object({
  /** Person who issued the passes */
  issuerPersonId: z.string().min(1),
  /** Filter by status: 'active' | 'used' | 'expired' | undefined (all) */
  status: z.string().optional(),
});
export class GetVisitorPassesDto extends createZodDto(GetVisitorPassesSchema) {}

export const VerifyUserPassTokenSchema = z.object({
  /** Raw token string from the scanned QR code */
  token: z.string().min(1),
  /** Seed secret for this person (resolved server-side) */
  personId: z.string().min(1),
});
export class VerifyUserPassTokenDto extends createZodDto(VerifyUserPassTokenSchema) {}

export const RecordVisitorPassUseSchema = z.object({
  visitorPassId: z.string().min(1),
});
export class RecordVisitorPassUseDto extends createZodDto(RecordVisitorPassUseSchema) {}

export const GenerateActivationCodeSchema = z.object({
  personId: z.string().min(1),
});
export class GenerateActivationCodeDto extends createZodDto(GenerateActivationCodeSchema) {}

export const EnrollUserPassSchema = z.object({
  personId: z.string().min(1),
  activationCode: z.string().length(6),
  pinHash: z.string().min(1),
});
export class EnrollUserPassDto extends createZodDto(EnrollUserPassSchema) {}

export const RevokeUserPassSchema = z.object({
  personId: z.string().min(1),
});
export class RevokeUserPassDto extends createZodDto(RevokeUserPassSchema) {}

export const RecordAccessEventSchema = z.object({
  personId: z.string().min(1),
  doorLabel: z.string().optional(),
  eventType: z.enum(['ENTRY', 'EXIT', 'DENIED', 'DURESS']),
  granted: z.boolean(),
  isDuress: z.boolean().optional(),
});
export class RecordAccessEventDto extends createZodDto(RecordAccessEventSchema) {}

