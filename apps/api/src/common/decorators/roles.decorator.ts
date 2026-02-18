import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@shipping/shared';

export const ROLES_KEY = 'roles';

/**
 * Marks a route with the roles allowed to access it.
 *
 * Usage:
 *   @Roles(UserRole.COMPANY_ADMIN, UserRole.BRANCH_MANAGER)
 *   @Get()
 *   findAll() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
