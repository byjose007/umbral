import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateOrganizationSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(128),
});
export class CreateOrganizationDto extends createZodDto(CreateOrganizationSchema) {}

export const CreateSiteSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(128),
  timezone: z.string().min(1).default('America/Guayaquil'),
  organizationId: z.string().min(1).optional(),
});
export class CreateSiteDto extends createZodDto(CreateSiteSchema) {}

export const CreateZoneSchema = z.object({
  siteId: z.string().uuid().or(z.string().min(1)),
  parentId: z.string().uuid().or(z.string().min(1)).optional().nullable(),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(128),
  apbMode: z.enum(['off', 'soft', 'hard', 'timed']).default('off'),
  apbResetSec: z.number().int().positive().optional().nullable(),
});
export class CreateZoneDto extends createZodDto(CreateZoneSchema) {}

export const CreateLockProfileSchema = z.object({
  name: z.string().min(1).max(128),
  actuationMode: z.enum(['pulse', 'maintained', 'toggle']),
  pulseDurationMs: z.number().int().min(100).max(10000).default(3000),
  unlockWindowMs: z.number().int().optional().nullable(),
  failState: z.enum(['fail_safe', 'fail_secure']),
  relayInverted: z.boolean().default(false),
  hasDoorPositionSensor: z.boolean().default(true),
  hasRexInput: z.boolean().default(true),
  hasTamperInput: z.boolean().default(true),
  heldOpenTimeoutSec: z.number().int().positive().optional().nullable(),
  heldOpenPrewarnSec: z.number().int().positive().optional().nullable(),
  rexGraceSec: z.number().int().positive().default(8),
  isEgressRoute: z.boolean().default(false),
  releasesOnFire: z.boolean().default(false),
});
export class CreateLockProfileDto extends createZodDto(
  CreateLockProfileSchema,
) {}

export const CreateControllerSchema = z.object({
  siteId: z.string().min(1),
  name: z.string().min(1).max(128),
  ipAddress: z.string().min(1),
  model: z.string().default('Simulator'),
  serialNumber: z.string().default('SIM-001'),
});
export class CreateControllerDto extends createZodDto(CreateControllerSchema) {}

export const CreateDoorSchema = z.object({
  siteId: z.string().min(1),
  controllerId: z.string().min(1),
  lockProfileId: z.string().min(1),
  zoneInsideId: z.string().min(1),
  zoneOutsideId: z.string().optional().nullable(),
  name: z.string().min(1).max(128),
  dpsSupervised: z.boolean().default(false),
  rexSupervised: z.boolean().default(false),
});
export class CreateDoorDto extends createZodDto(CreateDoorSchema) {}

export const CreateReaderSchema = z.object({
  doorId: z.string().min(1),
  name: z.string().min(1).max(128),
  protocol: z.enum(['osdp', 'wiegand', 'qr-camera']),
  direction: z.enum(['in', 'out']).default('in'),
  riskAcceptedBy: z.string().optional().nullable(),
});
export class CreateReaderDto extends createZodDto(CreateReaderSchema) {}

export const ProposeLifeSafetyChangeSchema = z.object({
  lockProfileId: z.string().min(1),
  author: z.string().min(1),
  reason: z.string().min(1),
  proposedChanges: CreateLockProfileSchema.partial(),
});
export class ProposeLifeSafetyChangeDto extends createZodDto(
  ProposeLifeSafetyChangeSchema,
) {}

export const ApproveLifeSafetyChangeSchema = z.object({
  versionId: z.string().min(1),
  approver: z.string().min(1),
});
export class ApproveLifeSafetyChangeDto extends createZodDto(
  ApproveLifeSafetyChangeSchema,
) {}

export const GrantAccessSchema = z.object({
  doorId: z.string().min(1),
  durationMs: z.number().int().positive().optional(),
});
export class GrantAccessDto extends createZodDto(GrantAccessSchema) {}
