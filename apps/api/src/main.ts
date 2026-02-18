import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // ─────────────────────────────────────────
  // Middleware
  // ─────────────────────────────────────────
  app.use(cookieParser());

  // ─────────────────────────────────────────
  // Global Validation Pipe
  // Note: We use Zod for validation in controllers, but this provides
  // additional safety for any class-validator decorated DTOs
  // ─────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ─────────────────────────────────────────
  // Global filter + interceptor
  // Every response goes through ResponseInterceptor (wraps in { success: true, data })
  // Every error goes through GlobalExceptionFilter (standardizes error shape)
  // ─────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ─────────────────────────────────────────
  // Global prefix
  // ─────────────────────────────────────────
  app.setGlobalPrefix('v1');

  // ─────────────────────────────────────────
  // CORS — allow all three frontend apps
  // ─────────────────────────────────────────
  const corsOrigins = config.get<string>('CORS_ORIGIN', '').split(',');
  app.enableCors({
    origin: corsOrigins,
    credentials: true, // Required for HTTP-only cookie (refresh token)
  });

  // ─────────────────────────────────────────
  // Swagger — only in dev and staging
  // ─────────────────────────────────────────
  const nodeEnv = config.get<string>('NODE_ENV');
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Shipping Platform API')
      .setDescription('Shipping Management SaaS Platform — API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    console.log(`📚 Swagger docs: http://localhost:${config.get('PORT')}/api/docs`);
  }

  // ─────────────────────────────────────────
  // Start server
  // ─────────────────────────────────────────
  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`🚀 API running on: http://localhost:${port}/v1`);
}

bootstrap();
