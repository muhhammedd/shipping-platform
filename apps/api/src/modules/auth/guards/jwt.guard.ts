import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protects routes with JWT access token.
 * Usage: @UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/**
 * Protects the refresh endpoint with the refresh token cookie.
 * Usage: @UseGuards(JwtRefreshGuard)
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
