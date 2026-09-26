import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Request, UseInterceptors } from '@nestjs/common';
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

  @Get('tables')
  async getTables() { return this.adminService.getTableList(); }

  @Get('tables/:table')
  async getRows(@Param('table') table: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('search') search?: string) {
    return this.adminService.getTableRows(table, Math.max(1, Number(page) || 1), Math.min(100, Math.max(1, Number(pageSize) || 25)), search || '');
  }

  @Post('tables/:table')
  async createRow(@Param('table') table: string, @Body() body: Record<string, unknown>, @Request() req: any) {
    return this.adminService.createTableRow(table, body, req.user.id);
  }

  @Patch('tables/:table/:id')
  async updateRow(@Param('table') table: string, @Param('id') id: string, @Body() body: Record<string, unknown>, @Request() req: any) {
    return this.adminService.updateTableRow(table, id, body, req.user.id);
  }

  @Delete('tables/:table/:id')
  async deleteRow(@Param('table') table: string, @Param('id') id: string, @Request() req: any) {
    return this.adminService.deleteTableRow(table, id, req.user.id);
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
