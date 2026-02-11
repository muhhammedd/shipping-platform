import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { BranchesModule } from './modules/branches/branches.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { CodModule } from './modules/cod/cod.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { StatsModule } from './modules/stats/stats.module';

@Module({
  imports: [
    // ─── Config (must be first) ───────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ─── Database ─────────────────────────────────────────
    PrismaModule,

    // ─── Feature Modules ──────────────────────────────────
    AuthModule,
    UsersModule,
    TenantsModule,
    BranchesModule,
    ShipmentsModule,
    CodModule,
    PricingModule,
    StatsModule,
  ],
})
export class AppModule {}
