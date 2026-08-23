import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, UseInterceptors, Delete } from '@nestjs/common';
import { LessonsService } from '../services/lessons.service';
import { CreateModuleDto } from '../lessons/dto/create-module.dto';
import { CreateLessonDto } from '../lessons/dto/create-lesson.dto';
import { AddPrerequisiteDto } from '../lessons/dto/add-prerequisite.dto';
import { UpdateLessonDto } from '../lessons/dto/update-lesson.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogInterceptor } from '../middlewares/audit-log.interceptor';
import { AuditLogAction } from '../auth/decorators/audit-log.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

  // POST endpoint to create a course Module (Restricted to Managers and Teachers)
  @Post('modules')
  @Roles(Role.MANAGER, Role.TEACHER)
  @AuditLogAction('MODULE_CREATE')
  @UseInterceptors(AuditLogInterceptor)
  async createModule(@Body() createModuleDto: CreateModuleDto) {
    return this.lessonsService.createModule(createModuleDto);
  }

  // POST endpoint to create a Lesson under a module (Restricted to Teachers)
  @Post('lessons')
  @Roles(Role.TEACHER)
  @AuditLogAction('LESSON_CREATE')
  @UseInterceptors(AuditLogInterceptor)
  async createLesson(@Body() createLessonDto: CreateLessonDto) {
    return this.lessonsService.createLesson(createLessonDto);
  }

  // POST endpoint to add a prerequisite to a lesson (Restricted to Teachers)
  @Post('lessons/:id/prerequisites')
  @Roles(Role.TEACHER)
  @AuditLogAction('LESSON_PREREQUISITE_ADD')
  @UseInterceptors(AuditLogInterceptor)
  async addPrerequisite(
    @Param('id') id: string,
    @Body() addPrereqDto: AddPrerequisiteDto,
  ) {
    return this.lessonsService.addPrerequisite(id, addPrereqDto.prerequisiteId);
  }

  // GET endpoint to view lesson details (Checks DAG prerequisites for students)
  @Get('lessons/:id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.lessonsService.findOne(id, req.user.id, req.user.role);
  }

  // POST endpoint to mark a lesson as completed (Restricted to Students)
  @Post('lessons/:id/complete')
  @Roles(Role.STUDENT)
  @AuditLogAction('LESSON_COMPLETE')
  @UseInterceptors(AuditLogInterceptor)
  async completeLesson(@Param('id') id: string, @Request() req: any) {
    return this.lessonsService.completeLesson(id, req.user.id);
  }

  // DELETE endpoint to remove a module (Restricted to Teachers/Managers)
  @Delete('modules/:id')
  @Roles(Role.TEACHER, Role.MANAGER)
  @AuditLogAction('MODULE_DELETE')
  @UseInterceptors(AuditLogInterceptor)
  async deleteModule(@Param('id') id: string) {
    return this.lessonsService.deleteModule(id);
  }

  // PATCH endpoint to update lesson content (Restricted to Teachers)
  @Patch('lessons/:id')
  @Roles(Role.TEACHER, Role.MANAGER)
  @AuditLogAction('LESSON_UPDATE')
  @UseInterceptors(AuditLogInterceptor)
  async updateLesson(@Param('id') id: string, @Body() updateLessonDto: UpdateLessonDto) {
    return this.lessonsService.updateLesson(id, updateLessonDto);
  }

  // DELETE endpoint to remove a lesson (Restricted to Teachers)
  @Delete('lessons/:id')
  @Roles(Role.TEACHER)
  @AuditLogAction('LESSON_DELETE')
  @UseInterceptors(AuditLogInterceptor)
  async deleteLesson(@Param('id') id: string) {
    return this.lessonsService.deleteLesson(id);
  }
}
