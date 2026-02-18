import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
} from '../../common/exceptions/app.exception';
import {
  AuthUser,
  UserRole,
  CreatePricingRuleDto,
  CalculatePriceDto,
} from '@shipping/shared';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // GET /pricing-rules — list all rules
  // ─────────────────────────────────────────
  async findAll(currentUser: AuthUser, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    // Only show rules for current tenant
    const where: any = {
      tenantId: currentUser.tenantId,
    };

    const [rules, total] = await this.prisma.$transaction([
      this.prisma.pricingRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { merchantId: 'asc' }, // null (default rules) first
          { zone: 'asc' },
          { weightFrom: 'asc' },
        ],
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.pricingRule.count({ where }),
    ]);

    return {
      data: rules,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────
  // GET /pricing-rules/:id
  // ─────────────────────────────────────────
  async findOne(id: string, currentUser: AuthUser) {
    const rule = await this.prisma.pricingRule.findUnique({
      where: { id },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!rule) throw new NotFoundException('Pricing rule', id);

    // Tenant isolation
    if (rule.tenantId !== currentUser.tenantId) {
      throw new NotFoundException('Pricing rule', id);
    }

    return rule;
  }

  // ─────────────────────────────────────────
  // POST /pricing-rules — create rule
  // ─────────────────────────────────────────
  async create(dto: CreatePricingRuleDto, currentUser: AuthUser) {
    // If merchantId is provided, verify merchant belongs to same tenant
    if (dto.merchantId) {
      const merchant = await this.prisma.user.findFirst({
        where: {
          id: dto.merchantId,
          tenantId: currentUser.tenantId,
          role: 'MERCHANT',
        },
      });

      if (!merchant) {
        throw new NotFoundException('Merchant', dto.merchantId);
      }
    }

    const rule = await this.prisma.pricingRule.create({
      data: {
        tenantId: currentUser.tenantId!,
        merchantId: dto.merchantId ?? null,
        zone: dto.zone,
        weightFrom: dto.weightFrom,
        weightTo: dto.weightTo,
        basePrice: dto.basePrice,
        isActive: true,
      },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return rule;
  }

  // ─────────────────────────────────────────
  // PATCH /pricing-rules/:id — update rule
  // ─────────────────────────────────────────
  async update(
    id: string,
    data: Partial<CreatePricingRuleDto>,
    currentUser: AuthUser,
  ) {
    const rule = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Pricing rule', id);

    // Tenant isolation
    if (rule.tenantId !== currentUser.tenantId) {
      throw new NotFoundException('Pricing rule', id);
    }

    return this.prisma.pricingRule.update({
      where: { id },
      data: {
        ...(data.zone && { zone: data.zone }),
        ...(data.weightFrom !== undefined && { weightFrom: data.weightFrom }),
        ...(data.weightTo !== undefined && { weightTo: data.weightTo }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
      },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  // ─────────────────────────────────────────
  // DELETE /pricing-rules/:id
  // ─────────────────────────────────────────
  async remove(id: string, currentUser: AuthUser) {
    const rule = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Pricing rule', id);

    // Tenant isolation
    if (rule.tenantId !== currentUser.tenantId) {
      throw new NotFoundException('Pricing rule', id);
    }

    await this.prisma.pricingRule.delete({ where: { id } });

    return { message: 'Pricing rule deleted successfully' };
  }

  // ─────────────────────────────────────────
  // POST /pricing-rules/calculate
  // Pricing resolution logic (from Phase 5):
  // 1. Look for merchant-specific rule
  // 2. If not found, use tenant default rule
  // 3. Return calculated price
  // ─────────────────────────────────────────
  async calculatePrice(dto: CalculatePriceDto, currentUser: AuthUser) {
    const { merchantId, city, weight } = dto;

    // 1. Try to find merchant-specific rule for this zone + weight
    let rule = await this.prisma.pricingRule.findFirst({
      where: {
        tenantId: currentUser.tenantId,
        merchantId: merchantId,
        zone: city,
        weightFrom: { lte: weight },
        weightTo: { gte: weight },
        isActive: true,
      },
      orderBy: { createdAt: 'desc' }, // Most recent if multiple matches
    });

    let appliedRule: 'merchant-specific' | 'tenant-default' | null = null;

    if (rule) {
      appliedRule = 'merchant-specific';
    } else {
      // 2. Fall back to tenant default rule (merchantId = null)
      rule = await this.prisma.pricingRule.findFirst({
        where: {
          tenantId: currentUser.tenantId,
          merchantId: null,
          zone: city,
          weightFrom: { lte: weight },
          weightTo: { gte: weight },
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (rule) {
        appliedRule = 'tenant-default';
      }
    }

    if (!rule) {
      // No matching rule found
      return {
        price: null,
        appliedRule: null,
        ruleId: null,
        message: `No pricing rule found for zone '${city}' and weight ${weight} kg`,
      };
    }

    return {
      price: rule.basePrice,
      appliedRule,
      ruleId: rule.id,
    };
  }
}
