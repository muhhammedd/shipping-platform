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
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AuthUser,
  UserRole,
  CreatePricingRuleSchema,
  CalculatePriceSchema,
} from '@shipping/shared';

@ApiTags('Pricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN) // COMPANY_ADMIN only
@Controller('pricing-rules')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  // ─────────────────────────────────────────
  // GET /pricing-rules
  // ─────────────────────────────────────────
  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pricingService.findAll(
      user,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  // ─────────────────────────────────────────
  // POST /pricing-rules/calculate
  // Note: Must be BEFORE /:id to avoid route collision
  // ─────────────────────────────────────────
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  calculatePrice(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const dto = CalculatePriceSchema.parse(body);
    return this.pricingService.calculatePrice(dto, user);
  }

  // ─────────────────────────────────────────
  // POST /pricing-rules
  // ─────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const dto = CreatePricingRuleSchema.parse(body);
    return this.pricingService.create(dto, user);
  }

  // ─────────────────────────────────────────
  // GET /pricing-rules/:id
  // ─────────────────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.pricingService.findOne(id, user);
  }

  // ─────────────────────────────────────────
  // PATCH /pricing-rules/:id
  // ─────────────────────────────────────────
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = CreatePricingRuleSchema.partial().parse(body);
    return this.pricingService.update(id, dto, user);
  }

  // ─────────────────────────────────────────
  // DELETE /pricing-rules/:id
  // ─────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.pricingService.remove(id, user);
  }
}
