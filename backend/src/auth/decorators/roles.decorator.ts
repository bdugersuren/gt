import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Custom decorator to assign authorized roles to specific route handlers
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
