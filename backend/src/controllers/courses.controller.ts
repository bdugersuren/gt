import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { CoursesService } from '../services/courses.service';
import { CreateCourseDto } from '../courses/dto/create-course.dto';
import { EnrollCourseDto } from '../courses/dto/enroll-course.dto';
import { UpdateCourseTeachersDto } from '../courses/dto/update-course-teachers.dto';
import { BulkEnrollCourseDto } from '../courses/dto/bulk-enroll-course.dto';
import { UpdateEnrollmentStatusDto } from '../courses/dto/update-enrollment-status.dto';
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
    @Body() dto: UpdateCourseTeachersDto,
  ) {
    return this.coursesService.updateTeachers(id, dto.teacherIds);
  }

  // Get details of a single course including modules & lessons
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.coursesService.findOne(id, req.user.id, req.user.roles);
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

  @Get(':id/enrollments')
  @Roles(Role.MANAGER)
  async getEnrollments(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('classGroupId') classGroupId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.coursesService.getEnrollments(id, { status, classGroupId, search, page, pageSize });
  }

  @Get(':id/enrollment-candidates')
  @Roles(Role.MANAGER)
  async getEnrollmentCandidates(
    @Param('id') id: string,
    @Query('classGroupId') classGroupId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.coursesService.getEnrollmentCandidates(id, { classGroupId, search, page, pageSize });
  }

  @Post(':id/enrollments/bulk')
  @Roles(Role.MANAGER)
  @AuditLogAction('COURSE_ENROLL_BULK')
  @UseInterceptors(AuditLogInterceptor)
  async bulkEnroll(@Param('id') id: string, @Body() dto: BulkEnrollCourseDto) {
    return this.coursesService.bulkEnroll(id, dto);
  }

  @Patch(':id/enrollments/status')
  @Roles(Role.MANAGER)
  @AuditLogAction('COURSE_ENROLLMENT_STATUS_UPDATE')
  @UseInterceptors(AuditLogInterceptor)
  async updateEnrollmentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentStatusDto,
    @Request() req: any,
  ) {
    return this.coursesService.updateEnrollmentStatus(id, dto, req.user.id);
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
