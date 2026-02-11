import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '../../common/exceptions/app.exception';
import { AuthUser, UserRole, CreateUserDto, GetUsersQueryDto } from '@shipping/shared';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // GET /users — list with filters
  // ─────────────────────────────────────────
  async findAll(query: GetUsersQueryDto, currentUser: AuthUser) {
    const { role, branchId, status, page, limit } = query;
    const skip = (page - 1) * limit;

    // Build the WHERE clause — always scoped to tenant
    const where: any = {};

    // Tenant scoping — enforced by role
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      // Super admin can see all users across all tenants
    } else {
      where.tenantId = currentUser.tenantId;
    }

    // Branch manager can only see users in their branch
    if (currentUser.role === UserRole.BRANCH_MANAGER) {
      where.branchId = currentUser.branchId;
    }

    if (role) where.role = role;
    if (branchId && currentUser.role !== UserRole.BRANCH_MANAGER) where.branchId = branchId;
    if (status) where.status = status;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: this.safeUserSelect(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────
  // GET /users/:id
  // ─────────────────────────────────────────
  async findOne(id: string, currentUser: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.safeUserSelect(),
    });

    if (!user) throw new NotFoundException('User', id);

    // Tenant isolation check
    this.assertCanAccessUser(user as any, currentUser);

    return user;
  }

  // ─────────────────────────────────────────
  // POST /users — create user
  // ─────────────────────────────────────────
  async create(dto: CreateUserDto, currentUser: AuthUser) {
    // Check email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('A user with this email already exists');

    const passwordHash = await AuthService.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role as any,
        branchId: dto.branchId ?? null,
        tenantId: currentUser.tenantId,  // Always scoped to current tenant
        status: 'ACTIVE',
      },
      select: this.safeUserSelect(),
    });

    return user;
  }

  // ─────────────────────────────────────────
  // PATCH /users/:id/status
  // ─────────────────────────────────────────
  async updateStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', currentUser: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User', id);

    this.assertCanAccessUser(user, currentUser);

    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: this.safeUserSelect(),
    });
  }

  // ─────────────────────────────────────────
  // PATCH /users/:id/branch — reassign courier
  // ─────────────────────────────────────────
  async updateBranch(id: string, branchId: string, currentUser: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User', id);

    this.assertCanAccessUser(user, currentUser);

    // Verify branch belongs to the same tenant
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId: currentUser.tenantId! },
    });
    if (!branch) throw new NotFoundException('Branch', branchId);

    return this.prisma.user.update({
      where: { id },
      data: { branchId },
      select: this.safeUserSelect(),
    });
  }

  // ─────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────

  private assertCanAccessUser(
    targetUser: { tenantId: string | null; branchId: string | null },
    currentUser: AuthUser,
  ) {
    if (currentUser.role === UserRole.SUPER_ADMIN) return; // Super admin bypasses all checks

    // Tenant isolation
    if (targetUser.tenantId !== currentUser.tenantId) {
      throw new NotFoundException('User', 'unknown'); // Don't reveal cross-tenant existence
    }

    // Branch manager can only manage their own branch
    if (
      currentUser.role === UserRole.BRANCH_MANAGER &&
      targetUser.branchId !== currentUser.branchId
    ) {
      throw new ForbiddenException('You can only manage users in your own branch');
    }
  }

  private safeUserSelect() {
    return {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      tenantId: true,
      branchId: true,
      createdAt: true,
      updatedAt: true,
      // passwordHash is NEVER selected
    };
  }
}
