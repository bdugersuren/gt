import { Controller, Post, Body, Param, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { EvaluationsService } from '../services/evaluations.service';
import { EvaluateSubmissionDto } from '../evaluations/dto/evaluate-submission.dto';
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
