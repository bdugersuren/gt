import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { QuizzesService } from '../services/quizzes.service';
import { CreateQuestionDto } from '../quizzes/dto/create-question.dto';
import { UpdateQuestionDto } from '../quizzes/dto/update-question.dto';
import { CreateQuizDto } from '../quizzes/dto/create-quiz.dto';
import { UpdateQuizDto } from '../quizzes/dto/update-quiz.dto';
import { SubmitAttemptDto } from '../quizzes/dto/submit-attempt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogInterceptor } from '../middlewares/audit-log.interceptor';
import { AuditLogAction } from '../auth/decorators/audit-log.decorator';

@Controller('quizzes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  // POST endpoint to add a question to the course question bank (Restricted to Teachers)
  @Post('questions')
  @Roles(Role.TEACHER)
  @AuditLogAction('QUESTION_CREATE')
  @UseInterceptors(AuditLogInterceptor)
  async createQuestion(@Body() createQuestionDto: CreateQuestionDto) {
    return this.quizzesService.createQuestion(createQuestionDto);
  }

  @Get('course/:courseId/questions')
  @Roles(Role.TEACHER)
  async findQuestionsByCourse(@Param('courseId') courseId: string) {
    return this.quizzesService.findQuestionsByCourse(courseId);
  }

  // PATCH endpoint to update a question (Restricted to Teachers)
  @Patch('questions/:id')
  @Roles(Role.TEACHER)
  @AuditLogAction('QUESTION_UPDATE')
  @UseInterceptors(AuditLogInterceptor)
  async updateQuestion(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto) {
    return this.quizzesService.updateQuestion(id, updateQuestionDto);
  }

  // DELETE endpoint to remove a question (Restricted to Teachers)
  @Delete('questions/:id')
  @Roles(Role.TEACHER)
  @AuditLogAction('QUESTION_DELETE')
  @UseInterceptors(AuditLogInterceptor)
  async deleteQuestion(@Param('id') id: string) {
    return this.quizzesService.deleteQuestion(id);
  }

  // POST endpoint to create a Quiz and assign questions (Restricted to Teachers)
  @Post()
  @Roles(Role.TEACHER)
  @AuditLogAction('QUIZ_CREATE')
  @UseInterceptors(AuditLogInterceptor)
  async createQuiz(@Body() createQuizDto: CreateQuizDto) {
    return this.quizzesService.createQuiz(createQuizDto);
  }

  @Get(':id/my-attempts')
  @Roles(Role.STUDENT)
  async getMyAttempts(@Param('id') id: string, @Request() req: any) {
    return this.quizzesService.getMyAttempts(id, req.user.id);
  }

  // GET endpoint to view a quiz (Hides correct answers for students)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.quizzesService.findOne(id, req.user.roles || (req.user.role ? [req.user.role] : []));
  }

  // PATCH endpoint to update a quiz (Restricted to Teachers)
  @Patch(':id')
  @Roles(Role.TEACHER)
  @AuditLogAction('QUIZ_UPDATE')
  @UseInterceptors(AuditLogInterceptor)
  async updateQuiz(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizzesService.updateQuiz(id, updateQuizDto);
  }

  // DELETE endpoint to remove a quiz (Restricted to Teachers)
  @Delete(':id')
  @Roles(Role.TEACHER)
  @AuditLogAction('QUIZ_DELETE')
  @UseInterceptors(AuditLogInterceptor)
  async deleteQuiz(@Param('id') id: string) {
    return this.quizzesService.deleteQuiz(id);
  }

  // GET endpoint to fetch quiz attempt statistics (Teacher only)
  @Get(':id/attempts')
  @Roles(Role.TEACHER, Role.MANAGER)
  async getQuizAttempts(@Param('id') id: string) {
    return this.quizzesService.getQuizAttempts(id);
  }

  // POST endpoint to submit a quiz attempt (Restricted to Students)
  @Post(':id/attempt')
  @Roles(Role.STUDENT)
  @AuditLogAction('QUIZ_ATTEMPT')
  @UseInterceptors(AuditLogInterceptor)
  async submitAttempt(
    @Param('id') id: string,
    @Body() submitAttemptDto: SubmitAttemptDto,
    @Request() req: any,
  ) {
    return this.quizzesService.submitAttempt(id, req.user.id, submitAttemptDto.answers || submitAttemptDto.answersJson || []);
  }
}
