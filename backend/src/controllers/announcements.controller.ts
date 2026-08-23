import { Controller, Get, Post, Body, UseGuards, Request, Headers } from '@nestjs/common';
import { AnnouncementsService } from '../services/announcements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  // Create general or targeted announcements (Restricted to Managers and Admins)
  @Post()
  @Roles(Role.MANAGER, Role.ADMIN)
  async createAnnouncement(
    @Body() body: { title: string; content: string; targetRole?: Role; targetUserId?: string },
    @Request() req: any,
  ) {
    return this.announcementsService.createAnnouncement(
      req.user.id,
      body.title,
      body.content,
      body.targetRole,
      body.targetUserId,
    );
  }

  // Retrieve visible announcements for the active user session context
  @Get()
  async getAnnouncements(
    @Headers('x-active-role') activeRoleHeader: string,
    @Request() req: any,
  ) {
    const activeRole = (activeRoleHeader as Role) || req.user.roles[0] || Role.STUDENT;
    return this.announcementsService.getAnnouncements(req.user.id, activeRole);
  }
}
