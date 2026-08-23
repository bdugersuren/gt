import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // Get recent Audit Logs
  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            code: true,
            roles: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  }

  // List recent backup files
  async getBackups() {
    return [];
  }

  // Create database & MinIO simulated backup
  async createBackup(executorId: string) {
    void executorId;
    throw new ServiceUnavailableException(
      'Хуурамч metadata backup идэвхгүй болсон. Баталгаатай pg_dump/MinIO backup-ийг ops backup job-оор ажиллуулна уу.',
    );
  }

  // Restore database
  async restoreBackup(filename: string, executorId: string) {
    void filename;
    void executorId;
    throw new ServiceUnavailableException(
      'Restore нь production API-аас шууд ажиллахгүй. Staging restore drill болон ажиллагааны зөвшөөрөл шаардлагатай.',
    );
  }
}
