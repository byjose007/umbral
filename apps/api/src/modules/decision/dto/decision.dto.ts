import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ScheduleWindowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(0).max(1439),
});

export const UserAccessLevelInputSchema = z.object({
  personId: z.string().min(1),
  credentialHash: z.string().min(1),
  isBlocked: z.boolean().optional(),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  hasActiveAbsenceBlocking: z.boolean().optional(),
  hasExpiredDocuments: z.boolean().optional(),
  normalPin: z.string().optional().nullable(),
  duressPin: z.string().optional().nullable(),
  doors: z.array(
    z.object({
      doorId: z.string().min(1),
      windows: z.array(ScheduleWindowSchema),
    })
  ),
});

export const CompileMatrixSchema = z.object({
  controllerId: z.string().min(1),
  matrixVersion: z.number().int().positive().default(1),
  userAccessLevels: z.array(UserAccessLevelInputSchema),
});
export class CompileMatrixDto extends createZodDto(CompileMatrixSchema) {}

export const EvaluateDecisionSchema = z.object({
  credentialHash: z.string().min(1),
  doorId: z.string().min(1),
  readerId: z.string().min(1),
  at: z.string().default(() => new Date().toISOString()),
  presentedPin: z.string().optional().nullable(),
  readerZoneInsideId: z.string().optional().nullable(),
  localState: z.object({
    matrix: z.any(),
    offlineMode: z.enum(['cached', 'deny_all', 'allow_known', 'unlocked']).default('cached'),
    isOffline: z.boolean().default(false),
    apbMode: z.enum(['off', 'soft', 'hard', 'timed']).optional(),
    apbResetSec: z.number().optional(),
    lastPassState: z.any().optional(),
    interlockBlockedDoors: z.array(z.string()).optional(),
  }),
});
export class EvaluateDecisionDto extends createZodDto(EvaluateDecisionSchema) {}
