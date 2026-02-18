import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UnauthorizedException } from '../../common/exceptions/app.exception';
import { AuthUser } from '@shipping/shared';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ─────────────────────────────────────────
  // Login — validate credentials, return tokens
  // ─────────────────────────────────────────
  async login(email: string, password: string) {
    // 1. Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Use same error for "not found" and "wrong password" to prevent user enumeration
      throw new UnauthorizedException('Invalid email or password');
    }

    // 2. Verify password
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Check user is active
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Your account has been suspended. Please contact support.');
    }

    // 4. Build AuthUser payload
    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as any,
      tenantId: user.tenantId,
      branchId: user.branchId,
    };

    // 5. Generate tokens
    const accessToken = this.generateAccessToken(authUser);
    const refreshToken = this.generateRefreshToken(user.id);

    return { accessToken, refreshToken, user: authUser };
  }

  // ─────────────────────────────────────────
  // Refresh — generate new access token
  // ─────────────────────────────────────────
  generateAccessToken(user: AuthUser): string {
    return this.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        branchId: user.branchId,
      },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );
  }

  generateRefreshToken(userId: string): string {
    return this.jwt.sign(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );
  }

  // ─────────────────────────────────────────
  // Hash password utility (used by UsersService)
  // ─────────────────────────────────────────
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}
