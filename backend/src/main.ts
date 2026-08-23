import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

function requireProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;
  const required = [
    'DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'TRANSCODER_SHARED_SECRET',
    'MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'CORS_ORIGINS',
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
  if ((process.env.JWT_SECRET || '').length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
}

async function bootstrap() {
  requireProductionConfig();
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend requests
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:3001')
    .split(',').map((origin) => origin.trim()).filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });
  
  // Base prefix for REST API endpoints
  app.setGlobalPrefix('api');
  
  // Apply validation globally using class-validator
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  app.enableShutdownHooks();
  
  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
