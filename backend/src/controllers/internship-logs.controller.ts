import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { InternshipLogsService } from '../services/internship-logs.service';
import { CreateLogDto } from '../internship-logs/dto/create-log.dto';
import { ReviewLogDto } from '../internship-logs/dto/review-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogInterceptor } from '../middlewares/audit-log.interceptor';
import { AuditLogAction } from '../auth/decorators/audit-log.decorator';

@Controller('internship-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InternshipLogsController {
  constructor(private internshipLogsService: InternshipLogsService) {}

  // POST endpoint to log daily internship report (Restricted to Students)
  @Post()
  @Roles(Role.STUDENT)
  @AuditLogAction('INTERNSHIP_LOG_CREATE')
  @UseInterceptors(AuditLogInterceptor)
  async createLog(@Body() createLogDto: CreateLogDto, @Request() req: any) {
    return this.internshipLogsService.createLog(req.user.id, createLogDto);
  }

  // GET endpoint to query internship logs
  @Get()
  async findLogs(@Query() query: { studentId?: string }, @Request() req: any) {
    return this.internshipLogsService.findLogs(query, req.user);
  }

  // POST endpoint to review, evaluate and sign off daily log (Restricted to Mentors and Teachers)
  @Post(':id/review')
  @Roles(Role.ENTERPRISE_MENTOR, Role.TEACHER)
  @AuditLogAction('INTERNSHIP_LOG_REVIEW')
  @UseInterceptors(AuditLogInterceptor)
  async reviewLog(
    @Param('id') id: string,
    @Body() reviewLogDto: ReviewLogDto,
    @Request() req: any,
  ) {
    return this.internshipLogsService.reviewLog(id, req.user.id, reviewLogDto);
  }
}
