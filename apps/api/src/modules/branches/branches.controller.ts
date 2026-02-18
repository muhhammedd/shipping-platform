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
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AuthUser,
  UserRole,
  CreateBranchSchema,
  UpdateBranchSchema,
} from '@shipping/shared';

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  // ─────────────────────────────────────────
  // GET /branches
  // ─────────────────────────────────────────
  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.branchesService.findAll(
      user,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // ─────────────────────────────────────────
  // POST /branches
  // ─────────────────────────────────────────
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const dto = CreateBranchSchema.parse(body);
    return this.branchesService.create(dto, user);
  }

  // ─────────────────────────────────────────
  // GET /branches/:id
  // ─────────────────────────────────────────
  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.branchesService.findOne(id, user);
  }

  // ─────────────────────────────────────────
  // PATCH /branches/:id
  // ─────────────────────────────────────────
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const dto = UpdateBranchSchema.parse(body);
    return this.branchesService.update(id, dto, user);
  }

  // ─────────────────────────────────────────
  // PATCH /branches/:id/status
  // ─────────────────────────────────────────
  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'INACTIVE' },
    @CurrentUser() user: AuthUser,
  ) {
    return this.branchesService.updateStatus(id, body.status, user);
  }
}
