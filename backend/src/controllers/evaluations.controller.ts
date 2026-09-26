import { Controller, Get, Post, Body, Param, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { EvaluationsService } from '../services/evaluations.service';
import { EvaluateSubmissionDto } from '../evaluations/dto/evaluate-submission.dto';
import { CreateSubmissionDto } from '../evaluations/dto/create-submission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogInterceptor } from '../middlewares/audit-log.interceptor';
import { AuditLogAction } from '../auth/decorators/audit-log.decorator';

@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationsController {
  constructor(private evaluationsService: EvaluationsService) {}

  @Post()
  @Roles(Role.STUDENT)
  async createSubmission(@Body() dto: CreateSubmissionDto, @Request() req: any) {
    return this.evaluationsService.createSubmission(req.user.id, dto);
  }

  @Get('mine')
  @Roles(Role.STUDENT)
  async mySubmissions(@Request() req: any) {
    return this.evaluationsService.getMySubmissions(req.user.id);
  }

  @Get('mine/:id')
  @Roles(Role.STUDENT)
  async mySubmission(@Param('id') id: string, @Request() req: any) {
    return this.evaluationsService.getMySubmission(id, req.user.id);
  }

  @Get()
  @Roles(Role.TEACHER, Role.ADMIN, Role.MANAGER, Role.ENTERPRISE_MENTOR)
  async getSubmissions(@Request() req: any) {
    const activeRole = req.user?.roles?.includes(Role.TEACHER) ? Role.TEACHER : Role.ENTERPRISE_MENTOR;
    return this.evaluationsService.getSubmissions(req.user.id, activeRole);
  }

  @Get('teacher/grades')
  @Roles(Role.TEACHER, Role.ADMIN, Role.MANAGER)
  async getTeacherGrades(@Request() req: any) {
    return this.evaluationsService.getTeacherGrades(req.user.id);
  }

  // POST endpoint to evaluate a student's submission (Restricted to Teachers and Mentors)
  @Post(':id/evaluate')
  @Roles(Role.TEACHER, Role.ENTERPRISE_MENTOR)
  @AuditLogAction('SUBMISSION_EVALUATE')
  @UseInterceptors(AuditLogInterceptor)
  async evaluateSubmission(
    @Param('id') id: string,
    @Body() evaluateSubmissionDto: EvaluateSubmissionDto,
    @Request() req: any,
  ) {
    return this.evaluationsService.evaluateSubmission(
      id,
      req.user.id,
      evaluateSubmissionDto,
    );
  }
}
