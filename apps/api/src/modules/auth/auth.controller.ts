import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { JwtRefreshGuard } from './guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@shipping/shared';
import { LoginSchema } from '@shipping/shared';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ─────────────────────────────────────────
  // POST /auth/login
  // ─────────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Validate with Zod (same schema used on frontend)
    const dto = LoginSchema.parse(body);

    const { accessToken, refreshToken, user } = await this.authService.login(
      dto.email,
      dto.password,
    );

    // Set refresh token as HTTP-only cookie (XSS-safe)
    this.setRefreshTokenCookie(res, refreshToken);

    return { accessToken, user };
  }

  // ─────────────────────────────────────────
  // POST /auth/refresh
  // ─────────────────────────────────────────
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@CurrentUser() user: AuthUser) {
    const accessToken = this.authService.generateAccessToken(user);
    return { accessToken };
  }

  // ─────────────────────────────────────────
  // POST /auth/logout
  // ─────────────────────────────────────────
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    // Clear the refresh token cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return { message: 'Logged out successfully' };
  }

  // ─────────────────────────────────────────
  // GET /auth/me
  // ─────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMe(@CurrentUser() user: AuthUser) {
    return user;
  }

  // ─────────────────────────────────────────
  // Private helper
  // ─────────────────────────────────────────
  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,                                           // Cannot be read by JavaScript
      secure: process.env.NODE_ENV === 'production',           // HTTPS only in production
      sameSite: 'strict',                                       // CSRF protection
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,                        // 7 days in milliseconds
    });
  }
}
