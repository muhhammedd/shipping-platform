import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@shipping/shared';

@ApiTags('Statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('company')
  @Roles(UserRole.COMPANY_ADMIN)
  getCompanyStats(
    @CurrentUser() user: AuthUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.statsService.getCompanyStats(user, dateFrom, dateTo);
  }

  @Get('branch')
  @Roles(UserRole.BRANCH_MANAGER)
  getBranchStats(
    @CurrentUser() user: AuthUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.statsService.getBranchStats(user, dateFrom, dateTo);
  }

  @Get('merchant')
  @Roles(UserRole.MERCHANT)
  getMerchantStats(
    @CurrentUser() user: AuthUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.statsService.getMerchantStats(user, dateFrom, dateTo);
  }
}
