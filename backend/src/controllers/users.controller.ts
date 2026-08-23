import { Controller, Post, Get, UseInterceptors, UploadedFile, UseGuards, Request, BadRequestException, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogInterceptor } from '../middlewares/audit-log.interceptor';
import { AuditLogAction } from '../auth/decorators/audit-log.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

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
