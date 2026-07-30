import { SetMetadata } from '@nestjs/common';
import { OperatorRole } from '@umbral/core';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: OperatorRole[]) => SetMetadata(ROLES_KEY, roles);
