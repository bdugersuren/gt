import {
  Controller, Get, Post, Delete, Patch, Body, Param,
  UseGuards, Request, UseInterceptors,
} from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';
import { CreateLiveSessionDto } from './dto/create-session.dto';
import { CreatePollDto } from './dto/create-poll.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogInterceptor } from '../middlewares/audit-log.interceptor';
import { AuditLogAction } from '../auth/decorators/audit-log.decorator';

@Controller('live-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LiveSessionsController {
  constructor(private liveSessionsService: LiveSessionsService) {}

  // POST — Create a new live session (Teacher only)
  @Post()
  @Roles(Role.TEACHER)
  @AuditLogAction('LIVE_SESSION_CREATE')
  @UseInterceptors(AuditLogInterceptor)
  async createSession(@Body() dto: CreateLiveSessionDto, @Request() req: any) {
    return this.liveSessionsService.createSession(req.user.id, dto);
  }

  // GET — List all sessions for a course
  @Get('course/:courseId')
  @Roles(Role.TEACHER, Role.MANAGER, Role.STUDENT)
  async getSessionsByCourse(@Param('courseId') courseId: string, @Request() req: any) {
    return this.liveSessionsService.getSessionsByCourse(courseId, req.user.id, req.user.roles);
  }

  // GET — Find by PIN code (students use this to preview before joining via WebSocket)
  @Get('code/:code')
  async findByCode(@Param('code') code: string, @Request() req: any) {
    return this.liveSessionsService.findByCode(code, req.user.id, req.user.roles);
  }

  // GET — Get single session details
  @Get(':id')
  @Roles(Role.TEACHER, Role.MANAGER)
  async getSession(@Param('id') id: string) {
    return this.liveSessionsService.getSession(id);
  }

  // PATCH — Start a session (status → LIVE)
  @Patch(':id/start')
  @Roles(Role.TEACHER)
  @AuditLogAction('LIVE_SESSION_START')
  @UseInterceptors(AuditLogInterceptor)
  async startSession(@Param('id') id: string, @Request() req: any) {
    return this.liveSessionsService.startSession(id, req.user.id);
  }

  // PATCH — End a session (status → ENDED)
  @Patch(':id/end')
  @Roles(Role.TEACHER)
  @AuditLogAction('LIVE_SESSION_END')
  @UseInterceptors(AuditLogInterceptor)
  async endSession(@Param('id') id: string, @Request() req: any) {
    return this.liveSessionsService.endSession(id, req.user.id);
  }

  // DELETE — Delete a scheduled session
  @Delete(':id')
  @Roles(Role.TEACHER)
  @AuditLogAction('LIVE_SESSION_DELETE')
  @UseInterceptors(AuditLogInterceptor)
  async deleteSession(@Param('id') id: string, @Request() req: any) {
    return this.liveSessionsService.deleteSession(id, req.user.id);
  }

  // POST — Create a poll in an active session
  @Post(':id/polls')
  @Roles(Role.TEACHER)
  async createPoll(
    @Param('id') sessionId: string,
    @Body() dto: CreatePollDto,
    @Request() req: any,
  ) {
    return this.liveSessionsService.createPoll(sessionId, req.user.id, dto);
  }

  // GET — Get poll results
  @Get('polls/:pollId/results')
  async getPollResults(@Param('pollId') pollId: string) {
    return this.liveSessionsService.getPollResults(pollId);
  }
}
