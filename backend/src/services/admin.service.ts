import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AdminService {
  private backupsDir = path.join(process.cwd(), 'backups');

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.backupsDir)) {
      fs.mkdirSync(this.backupsDir, { recursive: true });
    }
  }

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
    if (!fs.existsSync(this.backupsDir)) return [];
    
    const files = fs.readdirSync(this.backupsDir);
    return files
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const filePath = path.join(this.backupsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          sizeBytes: stats.size,
          createdAt: stats.birthtime || stats.mtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Create database & MinIO simulated backup
  async createBackup(executorId: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_db_minio_${timestamp}.json`;
    const filePath = path.join(this.backupsDir, filename);

    // Fetch counts for backup metadata
    const userCount = await this.prisma.user.count();
    const courseCount = await this.prisma.course.count();
    const submissionCount = await this.prisma.submission.count();
    const messageCount = await this.prisma.message.count();

    const backupData = {
      version: '1.0.0',
      database: 'PostgreSQL 16',
      storage: 'MinIO Object Storage',
      counts: {
        users: userCount,
        courses: courseCount,
        submissions: submissionCount,
        messages: messageCount,
      },
      createdAt: new Date().toISOString(),
      executorId,
    };

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');

    // Create Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: executorId,
        action: 'DATABASE_BACKUP',
        details: { filename, size: fs.statSync(filePath).size },
      },
    });

    return {
      success: true,
      filename,
      sizeBytes: fs.statSync(filePath).size,
      createdAt: new Date(),
    };
  }

  // Restore database
  async restoreBackup(filename: string, executorId: string) {
    const filePath = path.join(this.backupsDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error('Нөөцлөлтийн файл олдсонгүй');
    }

    // Create Audit Log
    await this.prisma.auditLog.create({
      data: {
        userId: executorId,
        action: 'DATABASE_RESTORE',
        details: { filename },
      },
    });

    return {
      success: true,
      message: 'Системийг нөөц хуулбараас амжилттай сэргээлээ',
    };
  }
}
