import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '../../common/exceptions/app.exception';
import { CreateTenantDto, UpdateTenantStatusDto, AuthUser } from '@shipping/shared';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // GET /tenants — list all (SUPER_ADMIN only)
  // ─────────────────────────────────────────
  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [tenants, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              branches: true,
              shipments: true,
            },
          },
        },
      }),
      this.prisma.tenant.count(),
    ]);

    return {
      data: tenants,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────
  // GET /tenants/:id
  // ─────────────────────────────────────────
  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            branches: true,
            shipments: true,
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant', id);
    return tenant;
  }

  // ─────────────────────────────────────────
  // POST /tenants — create tenant + first admin
  // ─────────────────────────────────────────
  async create(dto: CreateTenantDto) {
    // 1. Check slug uniqueness
    const existingSlug = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException(`Tenant with slug '${dto.slug}' already exists`);
    }

    // 2. Check admin email uniqueness
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (existingEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    // 3. Hash admin password
    const passwordHash = await AuthService.hashPassword(dto.adminPassword);

    // 4. Create tenant + first admin in one transaction
    const tenant = await this.prisma.$transaction(async (tx) => {
      // Create tenant
      const newTenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          status: 'ACTIVE',
          settings: dto.settings ?? {},
        },
      });

      // Create first COMPANY_ADMIN user
      await tx.user.create({
        data: {
          name: dto.adminName,
          email: dto.adminEmail,
          passwordHash,
          role: 'COMPANY_ADMIN',
          status: 'ACTIVE',
          tenantId: newTenant.id,
          branchId: null,
        },
      });

      return newTenant;
    });

    return tenant;
  }

  // ─────────────────────────────────────────
  // PATCH /tenants/:id — update tenant info
  // ─────────────────────────────────────────
  async update(id: string, data: { name?: string; settings?: any }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant', id);

    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.settings && { settings: data.settings }),
      },
    });
  }

  // ─────────────────────────────────────────
  // PATCH /tenants/:id/status
  // ─────────────────────────────────────────
  async updateStatus(id: string, dto: UpdateTenantStatusDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant', id);

    return this.prisma.tenant.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
