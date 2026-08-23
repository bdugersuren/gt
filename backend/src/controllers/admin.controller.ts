import { Controller, Get, Post, Param, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { AdminService } from '../services/admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogInterceptor } from '../middlewares/audit-log.interceptor';
import { AuditLogAction } from '../auth/decorators/audit-log.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('audit-logs')
  async getAuditLogs() {
    return this.adminService.getAuditLogs();
  }

  @Get('backups')
  async getBackups() {
    return this.adminService.getBackups();
  }

  @Post('backup')
  @AuditLogAction('DATABASE_BACKUP')
  @UseInterceptors(AuditLogInterceptor)
  async createBackup(@Request() req: any) {
    return this.adminService.createBackup(req.user.id);
  }

  @Post('restore/:filename')
  @AuditLogAction('DATABASE_RESTORE')
  @UseInterceptors(AuditLogInterceptor)
  async restoreBackup(@Param('filename') filename: string, @Request() req: any) {
    return this.adminService.restoreBackup(filename, req.user.id);
  }
}
