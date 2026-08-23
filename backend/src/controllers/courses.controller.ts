import { Controller, Get, Post, Body, Param, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { CoursesService } from '../services/courses.service';
import { CreateCourseDto } from '../courses/dto/create-course.dto';
import { EnrollCourseDto } from '../courses/dto/enroll-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AuditLogInterceptor } from '../middlewares/audit-log.interceptor';
import { AuditLogAction } from '../auth/decorators/audit-log.decorator';

@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  // Get list of courses according to user role permissions
  @Get()
  async findAll(@Request() req: any) {
    const activeRole = req.headers['x-active-role'] as Role | undefined;
    return this.coursesService.findAll(req.user.id, req.user.roles, activeRole);
  }

  // Update course teachers (Restricted to Managers)
  @Post(':id/teachers')
  @Roles(Role.MANAGER)
  @AuditLogAction('COURSE_TEACHERS_UPDATE')
  @UseInterceptors(AuditLogInterceptor)
  async updateTeachers(
    @Param('id') id: string,
    @Body('teacherIds') teacherIds: string[],
  ) {
    return this.coursesService.updateTeachers(id, teacherIds);
  }

  // Get details of a single course including modules & lessons
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  // Get student grades for the course
  @Get(':id/student-grades')
  async getStudentGrades(@Param('id') id: string, @Request() req: any) {
    return this.coursesService.getStudentGrades(id, req.user.id);
  }

  // Create a new course (Restricted to Managers)
  @Post()
  @Roles(Role.MANAGER)
  @AuditLogAction('COURSE_CREATE')
  @UseInterceptors(AuditLogInterceptor)
  async create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  // Enroll class group or student (Restricted to Managers)
  @Post(':id/enroll')
  @Roles(Role.MANAGER)
  @AuditLogAction('COURSE_ENROLL')
  @UseInterceptors(AuditLogInterceptor)
  async enroll(
    @Param('id') id: string,
    @Body() enrollCourseDto: EnrollCourseDto,
  ) {
    return this.coursesService.enroll(id, {
      type: enrollCourseDto.type,
      studentId: enrollCourseDto.studentId,
      classGroupId: enrollCourseDto.classGroupId,
      startDate: new Date(enrollCourseDto.startDate),
      endDate: new Date(enrollCourseDto.endDate),
    });
  }
}
