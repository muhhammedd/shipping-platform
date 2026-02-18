import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CodService } from './cod.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AuthUser,
  UserRole,
  CreateSettlementSchema,
  ConfirmPayoutSchema,
} from '@shipping/shared';

@ApiTags('COD')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cod')
export class CodController {
  constructor(private codService: CodService) {}

  // ═════════════════════════════════════════
  // COD Records
  // ═════════════════════════════════════════

  @Get('records')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  findAllRecords(
    @CurrentUser() user: AuthUser,
    @Query('merchantId') merchantId?: string,
    @Query('status') status?: 'COLLECTED' | 'SETTLED',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.codService.findAllRecords(
      user,
      merchantId,
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('records/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  findOneRecord(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.codService.findOneRecord(id, user);
  }

  // ═════════════════════════════════════════
  // COD Balance
  // ═════════════════════════════════════════

  @Get('balance/:merchantId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.MERCHANT)
  getBalance(@Param('merchantId') merchantId: string, @CurrentUser() user: AuthUser) {
    return this.codService.getBalance(merchantId, user);
  }

  // ═════════════════════════════════════════
  // COD Settlements
  // ═════════════════════════════════════════

  @Get('settlements')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  findAllSettlements(
    @CurrentUser() user: AuthUser,
    @Query('merchantId') merchantId?: string,
    @Query('status') status?: 'PENDING' | 'PAID',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.codService.findAllSettlements(
      user,
      merchantId,
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post('settlements')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  createSettlement(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const dto = CreateSettlementSchema.parse(body);
    return this.codService.createSettlement(dto, user);
  }

  @Get('settlements/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  findOneSettlement(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.codService.findOneSettlement(id, user);
  }

  @Patch('settlements/:id/pay')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  confirmPayout(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = ConfirmPayoutSchema.parse(body);
    return this.codService.confirmPayout(id, dto, user);
  }
}
