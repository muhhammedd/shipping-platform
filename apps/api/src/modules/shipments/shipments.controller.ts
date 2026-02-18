import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AuthUser,
  UserRole,
  CreateShipmentSchema,
  AssignCourierSchema,
  UpdateShipmentStatusSchema,
  GetShipmentsQuerySchema,
} from '@shipping/shared';

@ApiTags('Shipments')
@Controller('shipments')
export class ShipmentsController {
  constructor(private shipmentsService: ShipmentsService) {}

  // ─────────────────────────────────────────
  // Public endpoint: GET /shipments/tracking/:trackingNumber
  // Must be BEFORE authenticated routes to avoid auth requirement
  // ─────────────────────────────────────────
  @Get('tracking/:trackingNumber')
  @HttpCode(HttpStatus.OK)
  trackByNumber(@Param('trackingNumber') trackingNumber: string) {
    return this.shipmentsService.trackByNumber(trackingNumber);
  }

  // ═════════════════════════════════════════
  // All routes below require authentication
  // ═════════════════════════════════════════
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  // No class-level @Roles() — each endpoint defines its own

  // ─────────────────────────────────────────
  // GET /shipments
  // ─────────────────────────────────────────
  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.MERCHANT,
    UserRole.COURIER,
  )
  findAll(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    const validated = GetShipmentsQuerySchema.parse(query);
    return this.shipmentsService.findAll(validated, user);
  }

  // ─────────────────────────────────────────
  // POST /shipments
  // ─────────────────────────────────────────
  @Post()
  @Roles(UserRole.MERCHANT)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const dto = CreateShipmentSchema.parse(body);
    return this.shipmentsService.create(dto, user);
  }

  // ─────────────────────────────────────────
  // GET /shipments/:id
  // ─────────────────────────────────────────
  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.MERCHANT,
    UserRole.COURIER,
  )
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.shipmentsService.findOne(id, user);
  }

  // ─────────────────────────────────────────
  // GET /shipments/:id/history
  // ─────────────────────────────────────────
  @Get(':id/history')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.MERCHANT,
    UserRole.COURIER,
  )
  getHistory(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.shipmentsService.getHistory(id, user);
  }

  // ─────────────────────────────────────────
  // PATCH /shipments/:id/approve
  // Branch Manager approves a PENDING shipment → READY_FOR_PICKUP
  // This is the explicit "review and approve" action in the shipment lifecycle
  // ─────────────────────────────────────────
  @Patch(':id/approve')
  @Roles(UserRole.BRANCH_MANAGER, UserRole.COMPANY_ADMIN)
  approveShipment(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.shipmentsService.approveShipment(id, user);
  }

  // ─────────────────────────────────────────
  // PATCH /shipments/:id/assign
  // ─────────────────────────────────────────
  @Patch(':id/assign')
  @Roles(UserRole.BRANCH_MANAGER)
  assignCourier(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = AssignCourierSchema.parse(body);
    return this.shipmentsService.assignCourier(id, dto, user);
  }

  // ─────────────────────────────────────────
  // PATCH /shipments/:id/status
  // ─────────────────────────────────────────
  @Patch(':id/status')
  @Roles(UserRole.COURIER, UserRole.BRANCH_MANAGER)
  updateStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = UpdateShipmentStatusSchema.parse(body);
    return this.shipmentsService.updateStatus(id, dto, user);
  }

  // ─────────────────────────────────────────
  // DELETE /shipments/:id (Cancel)
  // ─────────────────────────────────────────
  @Delete(':id')
  @Roles(UserRole.MERCHANT, UserRole.COMPANY_ADMIN)
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.shipmentsService.cancel(id, user);
  }
}
