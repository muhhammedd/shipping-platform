import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  AppException,
} from '../../common/exceptions/app.exception';
import {
  AuthUser,
  UserRole,
  CreateSettlementDto,
  ConfirmPayoutDto,
  ErrorCode,
} from '@shipping/shared';

@Injectable()
export class CodService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // GET /cod/records — list COD records
  // ─────────────────────────────────────────
  async findAllRecords(
    currentUser: AuthUser,
    merchantId?: string,
    status?: 'COLLECTED' | 'SETTLED',
    page: number = 1,
    limit: number = 50,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: currentUser.tenantId,
    };

    if (merchantId) where.merchantId = merchantId;
    if (status) where.status = status;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.cODRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { collectedAt: 'desc' },
        include: {
          merchant: { select: { id: true, name: true, email: true } },
          courier: { select: { id: true, name: true } },
          shipment: {
            select: { id: true, trackingNumber: true, recipientName: true },
          },
          settlement: {
            select: { id: true, status: true, confirmedAt: true },
          },
        },
      }),
      this.prisma.cODRecord.count({ where }),
    ]);

    return {
      data: records,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────
  // GET /cod/records/:id
  // ─────────────────────────────────────────
  async findOneRecord(id: string, currentUser: AuthUser) {
    const record = await this.prisma.cODRecord.findUnique({
      where: { id },
      include: {
        merchant: { select: { id: true, name: true, email: true } },
        courier: { select: { id: true, name: true, phone: true } },
        shipment: {
          select: {
            id: true,
            trackingNumber: true,
            recipientName: true,
            recipientAddress: true,
            city: true,
          },
        },
        settlement: true,
      },
    });

    if (!record) throw new NotFoundException('COD record', id);

    // Tenant isolation
    if (record.tenantId !== currentUser.tenantId) {
      throw new NotFoundException('COD record', id);
    }

    return record;
  }

  // ─────────────────────────────────────────
  // GET /cod/balance/:merchantId
  // ─────────────────────────────────────────
  async getBalance(merchantId: string, currentUser: AuthUser) {
    // Verify merchant exists and belongs to tenant
    const merchant = await this.prisma.user.findFirst({
      where: {
        id: merchantId,
        role: 'MERCHANT',
        tenantId: currentUser.tenantId,
      },
    });

    if (!merchant) throw new NotFoundException('Merchant', merchantId);

    // Access control: Merchant can only see their own balance
    if (currentUser.role === UserRole.MERCHANT && currentUser.id !== merchantId) {
      throw new NotFoundException('Merchant', merchantId);
    }

    // Calculate pending balance (COLLECTED records)
    const pendingRecords = await this.prisma.cODRecord.findMany({
      where: {
        merchantId,
        status: 'COLLECTED',
      },
      select: { amount: true },
    });

    const pendingBalance = pendingRecords.reduce(
      (sum, record) => sum + Number(record.amount),
      0,
    );

    // Calculate total settled
    const settledRecords = await this.prisma.cODRecord.findMany({
      where: {
        merchantId,
        status: 'SETTLED',
      },
      select: { amount: true },
    });

    const settledTotal = settledRecords.reduce(
      (sum, record) => sum + Number(record.amount),
      0,
    );

    return {
      merchantId,
      merchantName: merchant.name,
      pendingBalance,
      settledTotal,
      recordCount: pendingRecords.length,
    };
  }

  // ─────────────────────────────────────────
  // GET /cod/settlements — list settlements
  // ─────────────────────────────────────────
  async findAllSettlements(
    currentUser: AuthUser,
    merchantId?: string,
    status?: 'PENDING' | 'PAID',
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: currentUser.tenantId,
    };

    if (merchantId) where.merchantId = merchantId;
    if (status) where.status = status;

    const [settlements, total] = await this.prisma.$transaction([
      this.prisma.cODSettlement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: { select: { id: true, name: true, email: true } },
          confirmer: { select: { id: true, name: true } },
          _count: { select: { codRecords: true } },
        },
      }),
      this.prisma.cODSettlement.count({ where }),
    ]);

    return {
      data: settlements,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────
  // POST /cod/settlements — create settlement
  // ─────────────────────────────────────────
  async createSettlement(dto: CreateSettlementDto, currentUser: AuthUser) {
    // 1. Verify merchant exists
    const merchant = await this.prisma.user.findFirst({
      where: {
        id: dto.merchantId,
        role: 'MERCHANT',
        tenantId: currentUser.tenantId,
      },
    });

    if (!merchant) throw new NotFoundException('Merchant', dto.merchantId);

    // 2. Check if there's already an open settlement for this merchant
    const existingPending = await this.prisma.cODSettlement.findFirst({
      where: {
        merchantId: dto.merchantId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      throw new ConflictException(
        'A pending settlement already exists for this merchant',
      );
    }

    // 3. Fetch all COLLECTED COD records for this merchant
    const collectedRecords = await this.prisma.cODRecord.findMany({
      where: {
        merchantId: dto.merchantId,
        status: 'COLLECTED',
      },
    });

    if (collectedRecords.length === 0) {
      throw new AppException(
        'NO_COLLECTED_COD',
        422,
        'No collected COD records found for this merchant',
      );
    }

    // 4. Calculate total amount
    const totalAmount = collectedRecords.reduce(
      (sum, record) => sum + Number(record.amount),
      0,
    );

    // 5. Create settlement in transaction
    const settlement = await this.prisma.$transaction(async (tx) => {
      const newSettlement = await tx.cODSettlement.create({
        data: {
          tenantId: currentUser.tenantId!,
          merchantId: dto.merchantId,
          totalAmount,
          status: 'PENDING',
          note: dto.note,
        },
        include: {
          merchant: { select: { id: true, name: true, email: true } },
          _count: { select: { codRecords: true } },
        },
      });

      // Link all collected records to this settlement
      await tx.cODRecord.updateMany({
        where: {
          merchantId: dto.merchantId,
          status: 'COLLECTED',
        },
        data: {
          settlementId: newSettlement.id,
        },
      });

      return newSettlement;
    });

    return settlement;
  }

  // ─────────────────────────────────────────
  // GET /cod/settlements/:id
  // ─────────────────────────────────────────
  async findOneSettlement(id: string, currentUser: AuthUser) {
    const settlement = await this.prisma.cODSettlement.findUnique({
      where: { id },
      include: {
        merchant: { select: { id: true, name: true, email: true, phone: true } },
        confirmer: { select: { id: true, name: true } },
        codRecords: {
          include: {
            shipment: {
              select: { trackingNumber: true, recipientName: true },
            },
          },
        },
      },
    });

    if (!settlement) throw new NotFoundException('Settlement', id);

    // Tenant isolation
    if (settlement.tenantId !== currentUser.tenantId) {
      throw new NotFoundException('Settlement', id);
    }

    return settlement;
  }

  // ─────────────────────────────────────────
  // PATCH /cod/settlements/:id/pay
  // ─────────────────────────────────────────
  async confirmPayout(id: string, dto: ConfirmPayoutDto, currentUser: AuthUser) {
    const settlement = await this.prisma.cODSettlement.findUnique({
      where: { id },
    });

    if (!settlement) throw new NotFoundException('Settlement', id);

    // Tenant isolation
    if (settlement.tenantId !== currentUser.tenantId) {
      throw new NotFoundException('Settlement', id);
    }

    // Check if already paid
    if (settlement.status === 'PAID') {
      throw new AppException(
        ErrorCode.COD_ALREADY_SETTLED,
        422,
        'This settlement has already been paid',
      );
    }

    // Update settlement and all linked COD records in transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Update settlement status
      const paidSettlement = await tx.cODSettlement.update({
        where: { id },
        data: {
          status: 'PAID',
          confirmedBy: currentUser.id,
          confirmedAt: new Date(),
          note: dto.note ?? settlement.note,
        },
        include: {
          merchant: { select: { id: true, name: true, email: true } },
          confirmer: { select: { id: true, name: true } },
          _count: { select: { codRecords: true } },
        },
      });

      // 2. Update all linked COD records to SETTLED
      await tx.cODRecord.updateMany({
        where: { settlementId: id },
        data: { status: 'SETTLED' },
      });

      return paidSettlement;
    });

    // TODO: Emit domain event → cod.settlement_confirmed
    // → Notify merchant via WebSocket / Email

    return updated;
  }
}
