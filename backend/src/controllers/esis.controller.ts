import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { EsisService } from '../services/esis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('esis')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EsisController {
  constructor(private esisService: EsisService) {}

  /**
   * Triggers manual synchronization with the Ministry of Education registry.
   * Access is limited to Academic Managers (MANAGER) and System Administrators (ADMIN).
   */
  @Post('sync')
  @Roles(Role.ADMIN, Role.MANAGER)
  async syncRegistry(@Request() req: any) {
    return this.esisService.syncAllStudents(req.user.id);
  }
}
