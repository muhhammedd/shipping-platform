import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser, UserRole } from '@shipping/shared';
import { ForbiddenException } from '../../common/exceptions/app.exception';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────
  // GET /stats/company — company-wide stats
  // ─────────────────────────────────────────
  async getCompanyStats(currentUser: AuthUser, dateFrom?: string, dateTo?: string) {
    const where: any = {
      tenantId: currentUser.tenantId,
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Total shipments
    const totalShipments = await this.prisma.shipment.count({ where });

    // Shipments by status
    const byStatus = await this.prisma.shipment.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const statusCounts = Object.fromEntries(
      byStatus.map((s) => [s.status, s._count]),
    );

    // Delivered and failed
    const delivered = statusCounts['DELIVERED'] ?? 0;
    const failed = statusCounts['FAILED_ATTEMPT'] ?? 0;
    const returned = statusCounts['RETURNED'] ?? 0;

    const deliverySuccessRate =
      delivered + failed + returned > 0
        ? ((delivered / (delivered + failed + returned)) * 100).toFixed(2)
        : '0.00';

    // COD stats
    const codRecords = await this.prisma.cODRecord.groupBy({
      by: ['status'],
      where: { tenantId: currentUser.tenantId },
      _sum: { amount: true },
      _count: true,
    });

    const codCollected =
      codRecords.find((r) => r.status === 'COLLECTED')?._sum.amount ?? 0;
    const codSettled =
      codRecords.find((r) => r.status === 'SETTLED')?._sum.amount ?? 0;

    // Active users
    const [totalMerchants, activeCouriers] = await Promise.all([
      this.prisma.user.count({
        where: { tenantId: currentUser.tenantId, role: 'MERCHANT' },
      }),
      this.prisma.user.count({
        where: { tenantId: currentUser.tenantId, role: 'COURIER', status: 'ACTIVE' },
      }),
    ]);

    return {
      totalShipments,
      pendingShipments: statusCounts['PENDING'] ?? 0,
      readyForPickup: statusCounts['READY_FOR_PICKUP'] ?? 0,
      assignedToCourier: statusCounts['ASSIGNED_TO_COURIER'] ?? 0,
      outForDelivery: statusCounts['OUT_FOR_DELIVERY'] ?? 0,
      deliveredToday: delivered,
      failedAttempts: failed,
      returnedShipments: returned,
      deliverySuccessRate: parseFloat(deliverySuccessRate),
      totalCODCollected: Number(codCollected),
      pendingCODSettlements: Number(codCollected),
      totalCODSettled: Number(codSettled),
      totalMerchants,
      activeCouriers,
    };
  }

  // ─────────────────────────────────────────
  // GET /stats/branch — branch stats
  // ─────────────────────────────────────────
  async getBranchStats(
    currentUser: AuthUser,
    branchId?: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    // Branch manager can only see their own branch
    const targetBranchId =
      currentUser.role === UserRole.BRANCH_MANAGER
        ? currentUser.branchId
        : branchId;

    if (!targetBranchId) {
      throw new ForbiddenException('branchId is required');
    }

    const where: any = {
      branchId: targetBranchId,
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const totalShipments = await this.prisma.shipment.count({ where });

    const byStatus = await this.prisma.shipment.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const statusCounts = Object.fromEntries(
      byStatus.map((s) => [s.status, s._count]),
    );

    const delivered = statusCounts['DELIVERED'] ?? 0;
    const failed = statusCounts['FAILED_ATTEMPT'] ?? 0;

    const activeCouriers = await this.prisma.user.count({
      where: { branchId: targetBranchId, role: 'COURIER', status: 'ACTIVE' },
    });

    return {
      branchId: targetBranchId,
      totalShipments,
      pendingShipments: statusCounts['PENDING'] ?? 0,
      outForDelivery: statusCounts['OUT_FOR_DELIVERY'] ?? 0,
      delivered,
      failed,
      activeCouriers,
    };
  }

  // ─────────────────────────────────────────
  // GET /stats/merchant — merchant stats
  // ─────────────────────────────────────────
  async getMerchantStats(
    currentUser: AuthUser,
    merchantId?: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    // Merchant can only see their own stats
    const targetMerchantId =
      currentUser.role === UserRole.MERCHANT ? currentUser.id : merchantId;

    if (!targetMerchantId) {
      throw new ForbiddenException('merchantId is required');
    }

    const where: any = {
      merchantId: targetMerchantId,
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const totalShipments = await this.prisma.shipment.count({ where });

    const byStatus = await this.prisma.shipment.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const statusCounts = Object.fromEntries(
      byStatus.map((s) => [s.status, s._count]),
    );

    // COD balance
    const codRecords = await this.prisma.cODRecord.groupBy({
      by: ['status'],
      where: { merchantId: targetMerchantId },
      _sum: { amount: true },
    });

    const pendingCOD =
      codRecords.find((r) => r.status === 'COLLECTED')?._sum.amount ?? 0;
    const settledCOD =
      codRecords.find((r) => r.status === 'SETTLED')?._sum.amount ?? 0;

    return {
      merchantId: targetMerchantId,
      totalShipments,
      pending: statusCounts['PENDING'] ?? 0,
      delivered: statusCounts['DELIVERED'] ?? 0,
      cancelled: statusCounts['CANCELLED'] ?? 0,
      pendingCODBalance: Number(pendingCOD),
      totalCODSettled: Number(settledCOD),
    };
  }

  // ─────────────────────────────────────────
  // GET /stats/courier — courier performance
  // ─────────────────────────────────────────
  async getCourierStats(
    currentUser: AuthUser,
    courierId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const where: any = {
      courierId,
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const totalAssigned = await this.prisma.shipment.count({ where });

    const byStatus = await this.prisma.shipment.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const statusCounts = Object.fromEntries(
      byStatus.map((s) => [s.status, s._count]),
    );

    const delivered = statusCounts['DELIVERED'] ?? 0;
    const failed = statusCounts['FAILED_ATTEMPT'] ?? 0;

    const successRate =
      delivered + failed > 0
        ? ((delivered / (delivered + failed)) * 100).toFixed(2)
        : '0.00';

    // COD collected by this courier
    const codCollected = await this.prisma.cODRecord.aggregate({
      where: { courierId },
      _sum: { amount: true },
      _count: true,
    });

    return {
      courierId,
      totalAssigned,
      delivered,
      failed,
      successRate: parseFloat(successRate),
      totalCODCollected: Number(codCollected._sum.amount ?? 0),
      codRecordCount: codCollected._count,
    };
  }
}
