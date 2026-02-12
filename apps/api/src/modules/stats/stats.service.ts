import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser, UserRole, ShipmentStatus } from '@shipping/shared';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getCompanyStats(currentUser: AuthUser, dateFrom?: string, dateTo?: string) {
    const tenantId = currentUser.tenantId!;
    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    const where: any = { tenantId };
    if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;

    const [
      totalShipments,
      pendingShipments,
      deliveredToday,
      failedAttempts,
      returnedShipments,
      totalCODCollected,
      pendingCODSettlements,
      totalMerchants,
      activeCouriers,
    ] = await Promise.all([
      this.prisma.shipment.count({ where }),
      this.prisma.shipment.count({ where: { ...where, status: ShipmentStatus.PENDING } }),
      this.prisma.shipment.count({
        where: {
          ...where,
          status: ShipmentStatus.DELIVERED,
          updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.shipment.count({ where: { ...where, status: ShipmentStatus.FAILED_ATTEMPT } }),
      this.prisma.shipment.count({ where: { ...where, status: ShipmentStatus.RETURNED } }),
      this.prisma.cODRecord.aggregate({
        where: { tenantId },
        _sum: { amount: true },
      }),
      this.prisma.cODSettlement.aggregate({
        where: { tenantId, status: 'PENDING' },
        _sum: { totalAmount: true },
      }),
      this.prisma.user.count({ where: { tenantId, role: UserRole.MERCHANT } }),
      this.prisma.user.count({ where: { tenantId, role: UserRole.COURIER, status: 'ACTIVE' } }),
    ]);

    const deliverySuccessRate = totalShipments > 0 
      ? (deliveredToday / totalShipments) * 100 // Simplified logic for example
      : 0;

    return {
      totalShipments,
      pendingShipments,
      deliveredToday,
      failedAttempts,
      returnedShipments,
      deliverySuccessRate: parseFloat(deliverySuccessRate.toFixed(2)),
      totalCODCollected: Number(totalCODCollected._sum.amount || 0),
      pendingCODSettlements: Number(pendingCODSettlements._sum.amount || 0),
      totalMerchants,
      activeCouriers,
    };
  }

  async getBranchStats(currentUser: AuthUser, dateFrom?: string, dateTo?: string) {
    const branchId = currentUser.branchId!;
    const where: any = { branchId };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [total, pending, delivered, outForDelivery] = await Promise.all([
      this.prisma.shipment.count({ where }),
      this.prisma.shipment.count({ where: { ...where, status: ShipmentStatus.PENDING } }),
      this.prisma.shipment.count({ where: { ...where, status: ShipmentStatus.DELIVERED } }),
      this.prisma.shipment.count({ where: { ...where, status: ShipmentStatus.OUT_FOR_DELIVERY } }),
    ]);

    return {
      totalShipments: total,
      pendingShipments: pending,
      deliveredShipments: delivered,
      outForDelivery,
    };
  }

  async getMerchantStats(currentUser: AuthUser, dateFrom?: string, dateTo?: string) {
    const merchantId = currentUser.id;
    const where: any = { merchantId };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [total, delivered, pending, codBalance] = await Promise.all([
      this.prisma.shipment.count({ where }),
      this.prisma.shipment.count({ where: { ...where, status: ShipmentStatus.DELIVERED } }),
      this.prisma.shipment.count({ where: { ...where, status: ShipmentStatus.PENDING } }),
      this.prisma.cODRecord.aggregate({
        where: { merchantId, status: 'COLLECTED' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalShipments: total,
      deliveredShipments: delivered,
      pendingShipments: pending,
      pendingCODBalance: Number(codBalance._sum.amount || 0),
    };
  }
}
