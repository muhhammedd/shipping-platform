import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import {
  NotFoundException,
  ForbiddenException,
  AppException,
} from '../../common/exceptions/app.exception';
import {
  AuthUser,
  UserRole,
  CreateShipmentDto,
  AssignCourierDto,
  UpdateShipmentStatusDto,
  GetShipmentsQueryDto,
  ShipmentStatus,
  ErrorCode,
} from '@shipping/shared';
import { ShipmentStateMachine } from './utils/state-machine';
import { TrackingNumberGenerator } from './utils/tracking-number';

@Injectable()
export class ShipmentsService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
  ) {}

  // ─────────────────────────────────────────
  // POST /shipments — create shipment
  // ─────────────────────────────────────────
  async create(dto: CreateShipmentDto, currentUser: AuthUser) {
    // 1. Calculate price using PricingService
    const priceResult = await this.pricingService.calculatePrice(
      {
        merchantId: currentUser.id,
        city: dto.city,
        weight: dto.weight,
      },
      currentUser,
    );

    if (!priceResult.price) {
      throw new AppException(
        'PRICING_NOT_CONFIGURED',
        422,
        `No pricing rule configured for city '${dto.city}' and weight ${dto.weight} kg`,
      );
    }

    // 2. Get merchant's default branch (first active branch in tenant)
    const branch = await this.prisma.branch.findFirst({
      where: {
        tenantId: currentUser.tenantId!,
        status: 'ACTIVE',
      },
    });

    if (!branch) {
      throw new AppException(
        'NO_ACTIVE_BRANCH',
        422,
        'No active branch found. Please contact support.',
      );
    }

    // 3. Get tenant settings for maxAttempts
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: currentUser.tenantId! },
    });
    const maxAttempts = (tenant?.settings as any)?.maxDeliveryAttempts ?? 3;

    // 4. Generate unique tracking number
    let trackingNumber: string;
    let attempts = 0;
    do {
      trackingNumber = TrackingNumberGenerator.generate();
      const existing = await this.prisma.shipment.findUnique({
        where: { trackingNumber },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    if (attempts >= 5) {
      throw new AppException(
        'TRACKING_NUMBER_GENERATION_FAILED',
        500,
        'Failed to generate unique tracking number. Please try again.',
      );
    }

    // 5. Create shipment + initial status history in transaction
    const shipment = await this.prisma.$transaction(async (tx) => {
      const newShipment = await tx.shipment.create({
        data: {
          trackingNumber,
          tenantId: currentUser.tenantId!,
          branchId: branch.id,
          merchantId: currentUser.id,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          recipientAddress: dto.recipientAddress,
          city: dto.city,
          weight: dto.weight,
          price: priceResult.price!, // Locked price
          codAmount: dto.codAmount,
          notes: dto.notes,
          maxAttempts,
          status: ShipmentStatus.PENDING,
          attemptCount: 0,
        },
      });

      // Create initial status history
      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: newShipment.id,
          status: ShipmentStatus.PENDING,
          changedBy: currentUser.id,
          note: 'Shipment created',
        },
      });

      return newShipment;
    });

    return shipment;
  }

  // ─────────────────────────────────────────
  // GET /shipments — list with filters
  // ─────────────────────────────────────────
  async findAll(query: GetShipmentsQueryDto, currentUser: AuthUser) {
    const { status, merchantId, courierId, branchId, city, dateFrom, dateTo, page, limit } =
      query;
    const skip = (page - 1) * limit;

    // Build WHERE clause with role-based filtering
    const where: any = {};

    // Role-based scoping
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      // See all shipments
    } else if (currentUser.role === UserRole.COMPANY_ADMIN) {
      where.tenantId = currentUser.tenantId;
    } else if (currentUser.role === UserRole.BRANCH_MANAGER) {
      where.tenantId = currentUser.tenantId;
      where.branchId = currentUser.branchId;
    } else if (currentUser.role === UserRole.MERCHANT) {
      where.merchantId = currentUser.id;
    } else if (currentUser.role === UserRole.COURIER) {
      where.courierId = currentUser.id;
    }

    // Apply filters
    if (status) where.status = status;
    if (merchantId && currentUser.role !== UserRole.MERCHANT) where.merchantId = merchantId;
    if (courierId && currentUser.role !== UserRole.COURIER) where.courierId = courierId;
    if (branchId && currentUser.role === UserRole.COMPANY_ADMIN) where.branchId = branchId;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [shipments, total] = await this.prisma.$transaction([
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: { select: { id: true, name: true, email: true } },
          courier: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, name: true, city: true } },
        },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return {
      data: shipments,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────
  // GET /shipments/:id
  // ─────────────────────────────────────────
  async findOne(id: string, currentUser: AuthUser) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        merchant: { select: { id: true, name: true, email: true, phone: true } },
        courier: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, name: true, city: true, address: true } },
        codRecord: true,
      },
    });

    if (!shipment) throw new NotFoundException('Shipment', id);

    // Access control
    this.assertCanAccessShipment(shipment, currentUser);

    return shipment;
  }

  // ─────────────────────────────────────────
  // GET /shipments/:id/history
  // ─────────────────────────────────────────
  async getHistory(id: string, currentUser: AuthUser) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException('Shipment', id);

    this.assertCanAccessShipment(shipment, currentUser);

    const history = await this.prisma.shipmentStatusHistory.findMany({
      where: { shipmentId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    return history;
  }

  // ─────────────────────────────────────────
  // PATCH /shipments/:id/approve
  // Branch Manager: PENDING → READY_FOR_PICKUP
  // This is the "review and accept" step before courier assignment
  // ─────────────────────────────────────────
  async approveShipment(id: string, currentUser: AuthUser) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException('Shipment', id);

    // Branch Manager can only approve shipments in their branch
    if (
      currentUser.role === UserRole.BRANCH_MANAGER &&
      shipment.branchId !== currentUser.branchId
    ) {
      throw new ForbiddenException('You can only approve shipments in your branch');
    }

    // Company Admin: must belong to same tenant
    if (
      currentUser.role === UserRole.COMPANY_ADMIN &&
      shipment.tenantId !== currentUser.tenantId
    ) {
      throw new ForbiddenException('You can only approve shipments in your company');
    }

    // Only PENDING shipments can be approved
    if (shipment.status !== ShipmentStatus.PENDING) {
      throw new AppException(
        ErrorCode.INVALID_STATUS_TRANSITION,
        422,
        `Shipment must be in PENDING status to approve. Current status: ${shipment.status}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const approvedShipment = await tx.shipment.update({
        where: { id },
        data: { status: ShipmentStatus.READY_FOR_PICKUP },
      });

      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: id,
          status: ShipmentStatus.READY_FOR_PICKUP,
          changedBy: currentUser.id,
          note: 'Shipment reviewed and approved by branch',
        },
      });

      return approvedShipment;
    });

    return updated;
  }

  // ─────────────────────────────────────────
  // PATCH /shipments/:id/assign
  // ─────────────────────────────────────────
  async assignCourier(id: string, dto: AssignCourierDto, currentUser: AuthUser) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException('Shipment', id);

    // Only Branch Manager can assign
    if (currentUser.role !== UserRole.BRANCH_MANAGER) {
      throw new ForbiddenException('Only Branch Managers can assign couriers');
    }

    // Must be in same branch
    if (shipment.branchId !== currentUser.branchId) {
      throw new ForbiddenException('You can only assign shipments in your own branch');
    }

    // Status must be READY_FOR_PICKUP
    if (shipment.status !== ShipmentStatus.READY_FOR_PICKUP) {
      throw new AppException(
        ErrorCode.SHIPMENT_ALREADY_ASSIGNED,
        422,
        `Shipment must be in READY_FOR_PICKUP status to assign. Current status: ${shipment.status}`,
      );
    }

    // Verify courier exists and belongs to same branch
    const courier = await this.prisma.user.findFirst({
      where: {
        id: dto.courierId,
        role: UserRole.COURIER,
        branchId: currentUser.branchId,
        status: 'ACTIVE',
      },
    });

    if (!courier) {
      throw new NotFoundException('Courier', dto.courierId);
    }

    // Update shipment in transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedShipment = await tx.shipment.update({
        where: { id },
        data: {
          courierId: dto.courierId,
          status: ShipmentStatus.ASSIGNED_TO_COURIER,
        },
      });

      // Log status change
      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: id,
          status: ShipmentStatus.ASSIGNED_TO_COURIER,
          changedBy: currentUser.id,
          note: `Assigned to courier: ${courier.name}`,
        },
      });

      return updatedShipment;
    });

    // TODO: Emit domain event → WebSocket notification to courier
    // This will be implemented when we add WebSocket gateway

    return updated;
  }

  // ─────────────────────────────────────────
  // PATCH /shipments/:id/status
  // Critical: State machine + auto-transitions
  // ─────────────────────────────────────────
  async updateStatus(id: string, dto: UpdateShipmentStatusDto, currentUser: AuthUser) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException('Shipment', id);

    // Access control: Only courier assigned to this shipment or branch manager
    if (currentUser.role === UserRole.COURIER) {
      if (shipment.courierId !== currentUser.id) {
        throw new ForbiddenException('You can only update shipments assigned to you');
      }
    } else if (currentUser.role === UserRole.BRANCH_MANAGER) {
      if (shipment.branchId !== currentUser.branchId) {
        throw new ForbiddenException('You can only update shipments in your branch');
      }
    } else {
      throw new ForbiddenException('Only couriers and branch managers can update status');
    }

    // Validate state transition
    ShipmentStateMachine.assertCanTransition(
      shipment.status as ShipmentStatus,
      dto.status,
    );

    // Validate COD for DELIVERED status
    if (dto.status === ShipmentStatus.DELIVERED && shipment.codAmount > 0) {
      if (!dto.codCollected) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          400,
          'codCollected is required when delivering a COD shipment',
        );
      }

      // Verify collected amount matches (±0.01 tolerance)
      const diff = Math.abs(Number(dto.codCollected) - Number(shipment.codAmount));
      if (diff > 0.01) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          400,
          `COD amount mismatch. Expected: ${shipment.codAmount}, Collected: ${dto.codCollected}`,
        );
      }
    }

    // Update in transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      let newAttemptCount = shipment.attemptCount;

      // Increment attempt count on FAILED_ATTEMPT
      if (dto.status === ShipmentStatus.FAILED_ATTEMPT) {
        newAttemptCount = shipment.attemptCount + 1;
      }

      // Check if max attempts reached
      const shouldAutoReturn = newAttemptCount >= shipment.maxAttempts;
      const finalStatus = shouldAutoReturn
        ? ShipmentStatus.RETURN_IN_PROGRESS
        : dto.status;

      // Update shipment
      const updatedShipment = await tx.shipment.update({
        where: { id },
        data: {
          status: finalStatus,
          attemptCount: newAttemptCount,
        },
      });

      // Log status change
      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: id,
          status: finalStatus,
          changedBy: currentUser.id,
          note: shouldAutoReturn
            ? `Max attempts (${shipment.maxAttempts}) reached. Auto-returning to branch.`
            : dto.note,
        },
      });

      // Create COD record if DELIVERED
      if (dto.status === ShipmentStatus.DELIVERED && shipment.codAmount > 0) {
        await tx.cODRecord.create({
          data: {
            shipmentId: id,
            tenantId: shipment.tenantId,
            merchantId: shipment.merchantId,
            courierId: currentUser.id,
            amount: dto.codCollected!,
            collectedAt: new Date(),
            status: 'COLLECTED',
          },
        });
      }

      return updatedShipment;
    });

    // TODO: Emit domain events
    // - shipment.delivered / shipment.failed_attempt / shipment.return_started
    // - WebSocket notifications to merchant

    return updated;
  }

  // ─────────────────────────────────────────
  // DELETE /shipments/:id (Cancel)
  // ─────────────────────────────────────────
  async cancel(id: string, currentUser: AuthUser) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException('Shipment', id);

    // Only merchant or company admin can cancel
    if (
      currentUser.role !== UserRole.COMPANY_ADMIN &&
      currentUser.id !== shipment.merchantId
    ) {
      throw new ForbiddenException('Only the merchant or admin can cancel this shipment');
    }

    // Can only cancel from PENDING or READY_FOR_PICKUP
    if (
      shipment.status !== ShipmentStatus.PENDING &&
      shipment.status !== ShipmentStatus.READY_FOR_PICKUP
    ) {
      throw new AppException(
        ErrorCode.SHIPMENT_CANNOT_BE_CANCELLED,
        422,
        `Cannot cancel shipment in status: ${shipment.status}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.shipment.update({
        where: { id },
        data: { status: ShipmentStatus.CANCELLED },
      });

      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: id,
          status: ShipmentStatus.CANCELLED,
          changedBy: currentUser.id,
          note: 'Shipment cancelled by user',
        },
      });

      return cancelled;
    });

    return updated;
  }

  // ─────────────────────────────────────────
  // GET /shipments/tracking/:trackingNumber
  // Public endpoint (no auth required)
  // ─────────────────────────────────────────
  async trackByNumber(trackingNumber: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingNumber },
      select: {
        trackingNumber: true,
        status: true,
        city: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment', trackingNumber);
    }

    // Get status history (public-safe fields only)
    const history = await this.prisma.shipmentStatusHistory.findMany({
      where: { shipment: { trackingNumber } },
      orderBy: { createdAt: 'asc' },
      select: {
        status: true,
        createdAt: true,
        note: true, // Safe to show generic notes
      },
    });

    return {
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      recipientCity: shipment.city,
      history: history.map((h) => ({
        status: h.status,
        timestamp: h.createdAt,
      })),
    };
  }

  // ─────────────────────────────────────────
  // Private helper — access control
  // ─────────────────────────────────────────
  private assertCanAccessShipment(
    shipment: { tenantId: string; branchId: string; merchantId: string; courierId: string | null },
    currentUser: AuthUser,
  ) {
    if (currentUser.role === UserRole.SUPER_ADMIN) return;

    // Tenant isolation
    if (shipment.tenantId !== currentUser.tenantId) {
      throw new NotFoundException('Shipment', 'unknown');
    }

    // Branch manager → same branch only
    if (
      currentUser.role === UserRole.BRANCH_MANAGER &&
      shipment.branchId !== currentUser.branchId
    ) {
      throw new ForbiddenException('You can only access shipments in your branch');
    }

    // Merchant → own shipments only
    if (currentUser.role === UserRole.MERCHANT && shipment.merchantId !== currentUser.id) {
      throw new ForbiddenException('You can only access your own shipments');
    }

    // Courier → assigned shipments only
    if (currentUser.role === UserRole.COURIER && shipment.courierId !== currentUser.id) {
      throw new ForbiddenException('You can only access shipments assigned to you');
    }
  }
}
