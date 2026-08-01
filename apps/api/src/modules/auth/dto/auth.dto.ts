import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export class LoginDto extends createZodDto(LoginSchema) {}

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export class RefreshDto extends createZodDto(RefreshSchema) {}

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
});
export class LogoutDto extends createZodDto(LogoutSchema) {}

const OperatorRoleSchema = z.enum(['admin', 'supervisor', 'guardia', 'auditor']);

export const CreateOperatorSchema = z.object({
  fullName: z.string().min(1).max(128),
  email: z.string().email(),
  password: z.string().min(6),
  role: OperatorRoleSchema,
  siteId: z.string().min(1),
  organizationId: z.string().min(1).optional(),
  assignedReaderId: z.string().min(1).optional().nullable(),
});
export class CreateOperatorDto extends createZodDto(CreateOperatorSchema) {}

export const UpdateOperatorSchema = z.object({
  role: OperatorRoleSchema.optional(),
  status: z.enum(['active', 'disabled']).optional(),
  organizationId: z.string().min(1).optional(),
  assignedReaderId: z.string().min(1).optional().nullable(),
});
export class UpdateOperatorDto extends createZodDto(UpdateOperatorSchema) {}
