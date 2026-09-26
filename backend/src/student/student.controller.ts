import { Controller, Get, Param, Patch, Body, Query, Put, UseGuards, Request } from '@nestjs/common';
import { StudentService } from './student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('students/me/dashboard')
  dashboard(@Request() req: any) { return this.studentService.dashboard(req.user.id); }

  @Get('students/me/progress')
  progress(@Request() req: any, @Query('courseId') courseId?: string) {
    return this.studentService.progress(req.user.id, courseId);
  }

  @Get('students/me/courses/:courseId/progress')
  courseProgress(@Request() req: any, @Param('courseId') courseId: string) {
    return this.studentService.progress(req.user.id, courseId);
  }

  @Get('students/me/grades')
  grades(@Request() req: any) { return this.studentService.grades(req.user.id); }

  @Get('students/me/lab')
  lab(@Request() req: any, @Query('courseId') courseId?: string, @Query('status') status?: string) {
    return this.studentService.lab(req.user.id, courseId, status);
  }

  @Get('users/me')
  me(@Request() req: any) { return this.studentService.me(req.user.id); }

  @Patch('users/me')
  updateMe(@Request() req: any, @Body() data: { fullName?: string; phone?: string; avatarUrl?: string }) {
    return this.studentService.updateMe(req.user.id, data);
  }

  @Patch('users/me/password')
  changePassword(@Request() req: any, @Body() data: { currentPassword: string; newPassword: string }) {
    return this.studentService.changePassword(req.user.id, data);
  }

  @Get('users/me/preferences')
  preferences(@Request() req: any) { return this.studentService.preferences(req.user.id); }

  @Patch('users/me/preferences')
  updatePreferences(@Request() req: any, @Body() data: { notificationEmail?: boolean; notificationInApp?: boolean }) {
    return this.studentService.updatePreferences(req.user.id, data);
  }

  @Get('lessons/:lessonId/notes')
  getNote(@Request() req: any, @Param('lessonId') lessonId: string) {
    return this.studentService.getNote(req.user.id, lessonId);
  }

  @Put('lessons/:lessonId/notes')
  saveNote(@Request() req: any, @Param('lessonId') lessonId: string, @Body('content') content: string) {
    return this.studentService.saveNote(req.user.id, lessonId, content);
  }

  @Get('lessons/:lessonId/gates')
  gates(@Request() req: any, @Param('lessonId') lessonId: string) {
    return this.studentService.gates(req.user.id, lessonId);
  }
}
