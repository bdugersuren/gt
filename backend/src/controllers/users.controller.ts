import { Controller, Post, Get, Body, Query, Res, UseInterceptors, UploadedFile, UseGuards, Request, BadRequestException, Param } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogInterceptor } from '../middlewares/audit-log.interceptor';
import { AuditLogAction } from '../auth/decorators/audit-log.decorator';
import { UserExcelImportService } from '../services/user-excel-import.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService, private excelImport: UserExcelImportService) {}

  private assertXlsx(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Excel файл хавсаргана уу');
    if (!file.originalname.toLowerCase().endsWith('.xlsx')) throw new BadRequestException('Зөвхөн .xlsx файл зөвшөөрнө');
    return file;
  }

  @Get('import/templates/:template')
  @Roles(Role.ADMIN, Role.MANAGER)
  async downloadImportTemplate(@Param('template') template: string, @Res() response: Response) {
    const type = this.excelImport.normalizeType(template === 'teachers' ? 'TEACHER' : template === 'students' ? 'STUDENT' : template);
    const file = await this.excelImport.template(type);
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', `attachment; filename="${type.toLowerCase()}-import-template.xlsx"`);
    response.send(file);
  }

  @Post('import/preview')
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async previewExcelImport(@UploadedFile() input: Express.Multer.File, @Query('type') rawType?: string) {
    const file = this.assertXlsx(input);
    return this.excelImport.preview(file.buffer, this.excelImport.normalizeType(rawType));
  }

  @Post('import/commit')
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async commitExcelImport(
    @UploadedFile() input: Express.Multer.File,
    @Query('type') rawType: string,
    @Body('fileChecksum') fileChecksum: string,
    @Request() req: any,
  ) {
    const file = this.assertXlsx(input);
    return this.excelImport.commit(file.buffer, this.excelImport.normalizeType(rawType), fileChecksum, req.user.id, file.originalname);
  }

  @Post('import/error-report')
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async downloadImportErrors(
    @UploadedFile() input: Express.Multer.File,
    @Query('type') rawType: string,
    @Res() response: Response,
  ) {
    const file = this.assertXlsx(input);
    const type = this.excelImport.normalizeType(rawType);
    const report = await this.excelImport.errorReport(file.buffer, type);
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', `attachment; filename="${type.toLowerCase()}-import-errors.xlsx"`);
    response.send(report);
  }

  @Get('profile/competency')
  async getCompetencyProfile(@Request() req: any) {
    return this.usersService.getCompetencyProfile(req.user.id);
  }

  @Get('students/dropout-risk')
  @Roles(Role.ADMIN, Role.MANAGER)
  async getDropoutRisks() {
    return this.usersService.getDropoutRisks();
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('role/:role')
  @Roles(Role.ADMIN, Role.MANAGER)
  async findUsersByRole(@Param('role') role: Role) {
    return this.usersService.findUsersByRole(role);
  }

  // POST endpoint to handle CSV imports (Restricted to Admin and Manager roles)
  @Post('import')
  @Roles(Role.ADMIN, Role.MANAGER)
  @AuditLogAction('USER_IMPORT')
  @UseInterceptors(FileInterceptor('file'), AuditLogInterceptor)
  async importUsers(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Импортлох CSV файлыг хавсаргана уу');
    }

    // Ensure it is a CSV file
    if (!file.originalname.endsWith('.csv') && file.mimetype !== 'text/csv') {
      throw new BadRequestException('Зөвхөн CSV форматтай файл илгээх боломжтой');
    }

    // Call service to process buffer
    return this.usersService.importUsersFromCsv(
      file.buffer,
      file.originalname,
      req.user.id,
    );
  }
}
