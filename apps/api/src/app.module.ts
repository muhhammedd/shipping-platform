import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
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

    // ─── BullMQ — Background Job Queue ────────────────────
    // Registered globally so any module can inject queues without
    // re-configuring the Redis connection. Uses REDIS_URL from .env.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || 6379,
            password: url.password || undefined,
          },
        };
      },
    }),

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
