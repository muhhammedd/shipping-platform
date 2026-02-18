import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
} from '../../common/exceptions/app.exception';
import { AuthUser, UserRole, CreateBranchDto, UpdateBranchDto } from '@shipping/shared';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // GET /branches — list with tenant scoping
  // ─────────────────────────────────────────
  async findAll(currentUser: AuthUser, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    // Build WHERE clause based on role
    const where: any = {};

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      // Super admin sees all branches across all tenants
    } else if (currentUser.role === UserRole.COMPANY_ADMIN) {
      // Company admin sees all branches in their tenant
      where.tenantId = currentUser.tenantId;
    } else if (currentUser.role === UserRole.BRANCH_MANAGER) {
      // Branch manager sees only their own branch
      where.id = currentUser.branchId;
    } else {
      // Other roles cannot access branches
      throw new ForbiddenException('You do not have permission to view branches');
    }

    const [branches, total] = await this.prisma.$transaction([
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              shipments: true,
            },
          },
        },
      }),
      this.prisma.branch.count({ where }),
    ]);

    return {
      data: branches,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────
  // GET /branches/:id
  // ─────────────────────────────────────────
  async findOne(id: string, currentUser: AuthUser) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            shipments: true,
          },
        },
      },
    });

    if (!branch) throw new NotFoundException('Branch', id);

    // Access control
    this.assertCanAccessBranch(branch, currentUser);

    return branch;
  }

  // ─────────────────────────────────────────
  // POST /branches — create branch
  // ─────────────────────────────────────────
  async create(dto: CreateBranchDto, currentUser: AuthUser) {
    // Only SUPER_ADMIN and COMPANY_ADMIN can create branches
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.COMPANY_ADMIN
    ) {
      throw new ForbiddenException('Only Company Admins can create branches');
    }

    const branch = await this.prisma.branch.create({
      data: {
        name: dto.name,
        city: dto.city,
        address: dto.address,
        tenantId: currentUser.tenantId!, // Always scoped to current user's tenant
        status: 'ACTIVE',
      },
      include: {
        _count: {
          select: {
            users: true,
            shipments: true,
          },
        },
      },
    });

    return branch;
  }

  // ─────────────────────────────────────────
  // PATCH /branches/:id — update branch
  // ─────────────────────────────────────────
  async update(id: string, dto: UpdateBranchDto, currentUser: AuthUser) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Branch', id);

    this.assertCanAccessBranch(branch, currentUser);

    // Only SUPER_ADMIN and COMPANY_ADMIN can update
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.COMPANY_ADMIN
    ) {
      throw new ForbiddenException('Only Company Admins can update branches');
    }

    return this.prisma.branch.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.city && { city: dto.city }),
        ...(dto.address && { address: dto.address }),
      },
      include: {
        _count: {
          select: {
            users: true,
            shipments: true,
          },
        },
      },
    });
  }

  // ─────────────────────────────────────────
  // PATCH /branches/:id/status
  // ─────────────────────────────────────────
  async updateStatus(
    id: string,
    status: 'ACTIVE' | 'INACTIVE',
    currentUser: AuthUser,
  ) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Branch', id);

    this.assertCanAccessBranch(branch, currentUser);

    // Only SUPER_ADMIN and COMPANY_ADMIN can change status
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.COMPANY_ADMIN
    ) {
      throw new ForbiddenException('Only Company Admins can change branch status');
    }

    return this.prisma.branch.update({
      where: { id },
      data: { status },
    });
  }

  // ─────────────────────────────────────────
  // Private helper — access control
  // ─────────────────────────────────────────
  private assertCanAccessBranch(
    branch: { tenantId: string; id: string },
    currentUser: AuthUser,
  ) {
    // Super admin bypasses all checks
    if (currentUser.role === UserRole.SUPER_ADMIN) return;

    // Tenant isolation
    if (branch.tenantId !== currentUser.tenantId) {
      throw new NotFoundException('Branch', branch.id); // Don't reveal cross-tenant existence
    }

    // Branch manager can only access their own branch
    if (
      currentUser.role === UserRole.BRANCH_MANAGER &&
      branch.id !== currentUser.branchId
    ) {
      throw new ForbiddenException('You can only access your own branch');
    }
  }
}
