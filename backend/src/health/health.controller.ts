import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import IORedis from 'ioredis';
import * as Minio from 'minio';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  live() {
    return { status: 'ok', service: 'backend', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    const checks: Record<string, string> = {};
    const redis = new IORedis(process.env.REDIS_URL!, {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      connectTimeout: 2000,
    });
    const minio = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT!,
      port: Number(process.env.MINIO_PORT || 9000),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
    });

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.postgres = 'ok';
      await redis.connect();
      await redis.ping();
      checks.redis = 'ok';
      await minio.bucketExists('lms-media');
      checks.minio = 'ok';
      return { status: 'ready', checks, timestamp: new Date().toISOString() };
    } catch (error) {
      checks.error = error instanceof Error ? error.message : 'dependency unavailable';
      throw new ServiceUnavailableException({ status: 'not_ready', checks });
    } finally {
      redis.disconnect();
    }
  }
}
