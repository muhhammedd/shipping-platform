import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '@shipping/shared';

/**
 * Extracts the authenticated user from the request.
 *
 * Usage in controller:
 *   @Get('me')
 *   getMe(@CurrentUser() user: AuthUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
