import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@shipping/shared';
import { AppException } from '../../common/exceptions/app.exception';

@ApiTags('Stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  // ─────────────────────────────────────────
  // GET /stats/company
  // ─────────────────────────────────────────
  @Get('company')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @HttpCode(HttpStatus.OK)
  getCompanyStats(
    @CurrentUser() user: AuthUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.statsService.getCompanyStats(user, dateFrom, dateTo);
  }

  // ─────────────────────────────────────────
  // GET /stats/branch
  // ─────────────────────────────────────────
  @Get('branch')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.BRANCH_MANAGER)
  @HttpCode(HttpStatus.OK)
  getBranchStats(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.statsService.getBranchStats(user, branchId, dateFrom, dateTo);
  }

  // ─────────────────────────────────────────
  // GET /stats/merchant
  // ─────────────────────────────────────────
  @Get('merchant')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.MERCHANT)
  @HttpCode(HttpStatus.OK)
  getMerchantStats(
    @CurrentUser() user: AuthUser,
    @Query('merchantId') merchantId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.statsService.getMerchantStats(user, merchantId, dateFrom, dateTo);
  }

  // ─────────────────────────────────────────
  // GET /stats/courier
  // ─────────────────────────────────────────
  @Get('courier')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.BRANCH_MANAGER)
  @HttpCode(HttpStatus.OK)
  getCourierStats(
    @CurrentUser() user: AuthUser,
    @Query('courierId') courierId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    if (!courierId) {
      throw new AppException('VALIDATION_ERROR', 400, 'courierId query parameter is required');
    }
    return this.statsService.getCourierStats(user, courierId, dateFrom, dateTo);
  }
}
