import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, EnrollmentSource, CBTStatus, EnrollmentStatus, Prisma } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  private pagination(pageValue?: string, pageSizeValue?: string) {
    const page = Math.max(1, Number.parseInt(pageValue || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeValue || '20', 10) || 20));
    return { page, pageSize, skip: (page - 1) * pageSize };
  }

  private mapTeachers<T extends { teachers?: Array<{ teacher: any }> }>(course: T) {
    const { teachers, ...rest } = course;
    const count = (rest as any)._count;
    return { ...rest, teachers: teachers?.map((assignment) => assignment.teacher) ?? [], ...(count ? { _count: { ...count, enrollments: count.enrollments ?? count.enrollments ?? 0 } } : {}) };
  }

  // Find all courses based on role permissions and activeRole override
  async findAll(userId: string, roles: Role[], activeRole?: Role) {
    const roleToUse = activeRole && roles.includes(activeRole) ? activeRole : (roles.includes(Role.STUDENT) ? Role.STUDENT : roles[0]);
    const include = {
      teachers: { include: { teacher: { select: { id: true, fullName: true, email: true, code: true, phone: true } } } },
      department: { select: { id: true, name: true, code: true } },
      _count: { select: { enrollments: true, modules: true } },
    } as const;
    let courses;
    if (roleToUse === Role.STUDENT) {
      courses = await this.prisma.course.findMany({
        where: {
          OR: [
            { enrollments: { some: { studentId: userId, status: EnrollmentStatus.ACTIVE } } },
            { enrollments: { some: { classGroup: { memberships: { some: { studentId: userId, isCurrent: true } } }, status: EnrollmentStatus.ACTIVE } } },
            { curriculumItems: { some: { enrollments: { some: { studentId: userId, status: EnrollmentStatus.ACTIVE } } } } },
            { curriculumItems: { some: { enrollments: { some: { classGroup: { memberships: { some: { studentId: userId, isCurrent: true } } }, status: EnrollmentStatus.ACTIVE } } } } },
          ],
        },
        include,
      });
    } else if (roleToUse === Role.TEACHER) {
      courses = await this.prisma.course.findMany({ where: { teachers: { some: { teacherId: userId } } }, include });
    } else {
      courses = await this.prisma.course.findMany({ include });
    }
    return courses.map((course) => this.mapTeachers(course));
  }

  // Find course details with modules and lessons list
  async findOne(id: string, userId: string, roles: Role[]) {
    await this.assertCourseAccess(id, userId, roles);
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        department: true,
        teachers: { include: { teacher: { select: { id: true, fullName: true, email: true, phone: true, code: true } } } },
        modules: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' }, include: { mediaAssets: true, quizzes: { include: { quizQuestions: true } }, assignments: { include: { rubrics: { include: { criteria: true } } } } } } },
        },
      },
    });
    if (!course) throw new NotFoundException('Хичээл олдсонгүй');
    return this.mapTeachers(course);
  }

  private async assertCourseAccess(courseId: string, userId: string, roles: Role[]) {
    if (roles.includes(Role.ADMIN) || roles.includes(Role.MANAGER)) return;
    const allowed = await this.prisma.course.count({
      where: {
        id: courseId,
        OR: [
          { teachers: { some: { teacherId: userId } } },
          { enrollments: { some: { studentId: userId, status: EnrollmentStatus.ACTIVE, startDate: { lte: new Date() }, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] } } },
          { enrollments: { some: { classGroup: { memberships: { some: { studentId: userId, isCurrent: true } } }, status: EnrollmentStatus.ACTIVE, startDate: { lte: new Date() }, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] } } },
          { curriculumItems: { some: { enrollments: { some: { studentId: userId, status: EnrollmentStatus.ACTIVE } } } } },
        ],
      },
    });
    if (!allowed) throw new ForbiddenException('Энэ курст хандах эрхгүй байна');
  }

  // Create a new Course  // Create a new Course (Restricted to Managers)
  async create(data: {
    title: string; code: string; description?: string; coverImage?: string; isCBT: boolean; departmentId: string; teacherId: string;
  }) {
    const department = await this.prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!department) throw new NotFoundException('Тэнхим олдсонгүй');
    const teacher = await this.prisma.user.findUnique({ where: { id: data.teacherId }, select: { id: true, roles: true } });
    if (!teacher || !teacher.roles.includes(Role.TEACHER)) throw new BadRequestException('Заасан багш хүчингүй байна');
    const code = data.code.trim().toUpperCase();
    if (await this.prisma.course.findUnique({ where: { code } })) throw new ConflictException(`Давхардаж байна: ${code} кодтой хичээл аль хэдийн бүртгэгдсэн байна`);
    const course = await this.prisma.course.create({
      data: { title: data.title.trim(), code, description: data.description?.trim() || undefined, coverImage: data.coverImage, isCBT: data.isCBT, departmentId: data.departmentId, teachers: { create: { teacherId: data.teacherId } } },
      include: { department: { select: { id: true, name: true, code: true } }, teachers: { include: { teacher: { select: { id: true, fullName: true, email: true, code: true } } } }, _count: { select: { enrollments: true, modules: true } } },
    });
    return this.mapTeachers(course);
  }

  async update(id: string, data: {
    title: string; code: string; description?: string; coverImage?: string; isCBT: boolean; departmentId: string; teacherIds: string[];
  }) {
    const existing = await this.prisma.course.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Хичээл олдсонгүй');
    const department = await this.prisma.department.findUnique({ where: { id: data.departmentId }, select: { id: true } });
    if (!department) throw new NotFoundException('Тэнхим олдсонгүй');
    const code = data.code.trim().toUpperCase();
    const duplicate = await this.prisma.course.findFirst({ where: { code, NOT: { id } }, select: { id: true } });
    if (duplicate) throw new ConflictException(`Давхардаж байна: ${code} кодтой хичээл аль хэдийн бүртгэгдсэн байна`);
    const teacherIds = [...new Set(data.teacherIds || [])];
    const teachers = await this.prisma.user.findMany({ where: { id: { in: teacherIds } }, select: { id: true, roles: true } });
    if (teachers.length !== teacherIds.length) throw new BadRequestException('Сонгосон багшийн мэдээлэл дутуу байна');
    if (teachers.some((teacher) => !teacher.roles.includes(Role.TEACHER))) throw new BadRequestException('Зөвхөн TEACHER эрхтэй хэрэглэгч сонгоно уу');
    await this.prisma.$transaction(async (tx) => {
      await tx.course.update({ where: { id }, data: { title: data.title.trim(), code, description: data.description?.trim() || null, coverImage: data.coverImage?.trim() || null, isCBT: data.isCBT, departmentId: data.departmentId } });
      await tx.courseTeacher.deleteMany({ where: { courseId: id } });
      if (teacherIds.length) await tx.courseTeacher.createMany({ data: teacherIds.map((teacherId) => ({ courseId: id, teacherId })) });
    });
    const course = await this.prisma.course.findUnique({ where: { id }, include: { department: { select: { id: true, name: true, code: true } }, teachers: { include: { teacher: { select: { id: true, fullName: true, email: true, code: true } } } }, _count: { select: { enrollments: true, modules: true } } } });
    return course ? this.mapTeachers(course) : null;
  }

  async remove(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: { id: true, title: true, _count: { select: { curriculumItems: true, enrollments: true, modules: true, questionBank: true, liveSessions: true, requiredByVacancies: true } } },
    });
    if (!course) throw new NotFoundException('Хичээл олдсонгүй');
    const used = Object.entries(course._count).filter(([, count]) => count > 0).map(([key, count]) => `${key}: ${count}`);
    if (used.length) throw new ConflictException(`Энэ курс холбоотой өгөгдөлтэй тул устгах боломжгүй (${used.join(', ')}). Эхлээд холбоосуудыг цэвэрлэнэ үү.`);
    await this.prisma.course.delete({ where: { id } });
    return { id, deleted: true, title: course.title };
  }

  // Enroll student or class-batch to a course  // Enroll student or class-batch to a course (Restricted to Managers)
  async enroll(
    courseId: string,
    data: { source?: EnrollmentSource; type?: string; studentId?: string; classGroupId?: string; curriculumItemId?: string; startDate: Date; endDate?: Date },
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new NotFoundException('Хичээл олдсонгүй');
    const source = data.source ?? (data.type === 'CLASS_BATCH' ? EnrollmentSource.CLASS_BATCH : EnrollmentSource.STANDALONE);
    if (source === EnrollmentSource.CURRICULUM && !data.curriculumItemId) throw new BadRequestException('Curriculum item заавал сонгоно уу');
    if (!data.studentId && source !== EnrollmentSource.CLASS_BATCH) throw new BadRequestException('Суралцагчийн ID-г оруулна уу');
    if (data.studentId) {
      const profile = await this.prisma.studentProfile.findUnique({ where: { userId: data.studentId } });
      if (!profile) throw new BadRequestException('Суралцагчийн profile олдсонгүй');
    }
    if (source === EnrollmentSource.CLASS_BATCH && !data.classGroupId) throw new BadRequestException('Ангийн ID-г оруулна уу');
    if (data.classGroupId && !(await this.prisma.classGroup.findUnique({ where: { id: data.classGroupId } }))) throw new NotFoundException('Анги олдсонгүй');
    const where = source === EnrollmentSource.CURRICULUM
      ? { studentId: data.studentId, curriculumItemId: data.curriculumItemId }
      : { studentId: data.studentId, standaloneCourseId: courseId, classGroupId: data.classGroupId };
    if (await this.prisma.enrollment.findFirst({ where })) throw new ConflictException('Энэхүү enrollment аль хэдийн бүртгэгдсэн байна');
    return this.prisma.enrollment.create({
      data: ({ source, studentId: data.studentId, standaloneCourseId: source === EnrollmentSource.CURRICULUM ? undefined : courseId, curriculumItemId: data.curriculumItemId, classGroupId: data.classGroupId, startDate: data.startDate, endDate: data.endDate, status: EnrollmentStatus.ACTIVE, cbtStatus: CBTStatus.NOT_EVALUATED } as Prisma.EnrollmentUncheckedCreateInput),
      include: { student: { include: { user: true } }, standaloneCourse: true, curriculumItem: { include: { course: true } } },
    });
  }

  async getEnrollments(courseId: string, query: { status?: string; classGroupId?: string; search?: string; page?: string; pageSize?: string }) {
    if (!(await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) throw new NotFoundException('Хичээл олдсонгүй');
    if (query.status && !Object.values(EnrollmentStatus).includes(query.status as EnrollmentStatus)) throw new BadRequestException('Бүртгэлийн төлөв буруу байна');
    const { page, pageSize, skip } = this.pagination(query.page, query.pageSize);
    const status = query.status as EnrollmentStatus | undefined;
    const search = query.search?.trim();
    const courseFilter: Prisma.EnrollmentWhereInput = { OR: [{ standaloneCourseId: courseId }, { curriculumItem: { courseId } }] };
    const where: Prisma.EnrollmentWhereInput = {
      ...courseFilter,
      studentId: { not: null },
      ...(status ? { status } : {}),
      ...(query.classGroupId ? { student: { classMemberships: { some: { classGroupId: query.classGroupId, isCurrent: true } } } } : {}),
      ...(search ? { student: { user: { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } } } : {}),
    };
    const [items, total, statusRows, totalLessons, classGroups] = await this.prisma.$transaction([
      this.prisma.enrollment.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, include: { student: { include: { user: true, classMemberships: { where: { isCurrent: true }, include: { classGroup: true } } } }, standaloneCourse: true, curriculumItem: { include: { course: true } } } }),
      this.prisma.enrollment.count({ where }),
      this.prisma.enrollment.findMany({ where: { ...courseFilter, studentId: { not: null } }, select: { status: true } }),
      this.prisma.lesson.count({ where: { module: { courseId } } }),
      this.prisma.classGroup.findMany({ where: { memberships: { some: { isCurrent: true, student: { enrollments: { some: courseFilter } } } } }, orderBy: { code: 'asc' }, select: { id: true, name: true, code: true } }),
    ]);
    const studentIds = items.flatMap((item) => item.studentId ? [item.studentId] : []);
    const progress = studentIds.length ? await this.prisma.progressLog.groupBy({ by: ['studentId'], where: { studentId: { in: studentIds }, completed: true, lesson: { module: { courseId } } }, _count: { _all: true } }) : [];
    const progressMap = new Map(progress.map((item) => [item.studentId, item._count._all]));
    return {
      items: items.map((item) => ({ ...item, studentId: item.studentId, courseId, student: item.student ? { ...item.student.user, classGroup: item.student.classMemberships[0]?.classGroup ?? null } : null, progress: { completedLessons: item.studentId ? progressMap.get(item.studentId) || 0 : 0, totalLessons, percent: totalLessons && item.studentId ? Math.round(((progressMap.get(item.studentId) || 0) / totalLessons) * 100) : 0 } })),
      counts: Object.fromEntries(Object.values(EnrollmentStatus).map((value) => [value, statusRows.filter((row) => row.status === value).length])),
      classGroups,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getEnrollmentCandidates(courseId: string, query: { classGroupId?: string; search?: string; page?: string; pageSize?: string }) {
    if (!(await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) throw new NotFoundException('Хичээл олдсонгүй');
    const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1);
    const pageSize = Math.min(500, Math.max(1, Number.parseInt(query.pageSize || '100', 10) || 100));
    const skip = (page - 1) * pageSize;
    const search = query.search?.trim();
    const where: Prisma.StudentProfileWhereInput = {
      status: 'ACTIVE',
      enrollments: { none: { OR: [{ standaloneCourseId: courseId }, { curriculumItem: { courseId } }] } },
      ...(query.classGroupId ? { classMemberships: { some: { classGroupId: query.classGroupId, isCurrent: true } } } : {}),
      ...(search ? { user: { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } } : {}),
    };
    const [profiles, total, classes] = await this.prisma.$transaction([
      this.prisma.studentProfile.findMany({ where, skip, take: pageSize, orderBy: { user: { fullName: 'asc' } }, include: { user: true, classMemberships: { where: { isCurrent: true }, include: { classGroup: true } } } }),
      this.prisma.studentProfile.count({ where }),
      this.prisma.classGroup.findMany({ where: { memberships: { some: { isCurrent: true, student: { is: { enrollments: { none: { OR: [{ standaloneCourseId: courseId }, { curriculumItem: { courseId } }] } } } } } } }, orderBy: { code: 'asc' }, select: { id: true, name: true, code: true, _count: { select: { memberships: true } } } }),
    ]);
    const items = profiles.map((profile) => ({ ...profile.user, classGroup: profile.classMemberships[0]?.classGroup ?? null }));
    return { items, classGroups: classes.map((item) => ({ id: item.id, name: item.name, code: item.code, count: item._count.memberships })), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async bulkEnroll(courseId: string, data: { studentIds: string[]; startDate: string; endDate: string }) {
    const startDate = new Date(data.startDate); const endDate = new Date(data.endDate);
    if (endDate < startDate) throw new BadRequestException('Дуусах огноо эхлэх огнооноос өмнө байж болохгүй');
    if (!(await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }))) throw new NotFoundException('Хичээл олдсонгүй');
    const profiles = await this.prisma.studentProfile.findMany({ where: { userId: { in: data.studentIds }, status: 'ACTIVE' }, select: { userId: true } });
    if (profiles.length !== data.studentIds.length) throw new BadRequestException('Зарим суралцагчийн profile олдсонгүй');
    const existing = await this.prisma.enrollment.findMany({ where: { studentId: { in: data.studentIds }, standaloneCourseId: courseId }, select: { studentId: true } });
    if (existing.length) throw new ConflictException('Сонгосон суралцагчдын зарим нь энэ курст бүртгэлтэй байна');
    const result = await this.prisma.$transaction(data.studentIds.map((studentId) => this.prisma.enrollment.create({ data: { source: EnrollmentSource.STANDALONE, studentId: studentId, standaloneCourseId: courseId, startDate, endDate, status: EnrollmentStatus.ACTIVE, cbtStatus: CBTStatus.NOT_EVALUATED }, select: { id: true, studentId: true } })));
    return { courseId, enrolledCount: result.length, enrollmentIds: result.map((item) => item.id) };
  }

  async updateEnrollmentStatus(courseId: string, data: { enrollmentIds: string[]; status: EnrollmentStatus; reason?: string }, executorId: string) {
    const reason = data.reason?.trim();
    if (data.status === EnrollmentStatus.FAILED && !reason) throw new BadRequestException('Унасан төлөвт шалтгаан заавал оруулна');
    const courseFilter: Prisma.EnrollmentWhereInput = { OR: [{ standaloneCourseId: courseId }, { curriculumItem: { courseId } }] };
    const count = await this.prisma.enrollment.count({ where: { id: { in: data.enrollmentIds }, ...courseFilter, studentId: { not: null } } });
    if (count !== data.enrollmentIds.length) throw new BadRequestException('Зарим enrollment олдсонгүй эсвэл өөр курст хамаарч байна');
    const result = await this.prisma.enrollment.updateMany({ where: { id: { in: data.enrollmentIds }, ...courseFilter }, data: { status: data.status, statusReason: data.status === EnrollmentStatus.FAILED ? reason : null, statusChangedAt: new Date(), statusChangedById: executorId } });
    return { courseId, status: data.status, updatedCount: result.count };
  }

  // Update course teachers (Restricted to Managers)
  async updateTeachers(courseId: string, teacherIds: string[]) {
    if (!(await this.prisma.course.findUnique({ where: { id: courseId } }))) throw new NotFoundException('Хичээл олдсонгүй');
    const uniqueIds = [...new Set(teacherIds)];
    const teachers = await this.prisma.user.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, roles: true } });
    const found = new Set(teachers.map((teacher) => teacher.id));
    const missing = uniqueIds.filter((id) => !found.has(id));
    if (missing.length) throw new BadRequestException(`Багш олдсонгүй: ${missing.join(', ')}`);
    const invalid = teachers.filter((teacher) => !teacher.roles.includes(Role.TEACHER)).map((teacher) => teacher.id);
    if (invalid.length) throw new BadRequestException(`TEACHER эрхгүй хэрэглэгч сонгогдсон байна: ${invalid.join(', ')}`);
    await this.prisma.$transaction(async (tx) => {
      await tx.courseTeacher.deleteMany({ where: { courseId } });
      if (uniqueIds.length) await tx.courseTeacher.createMany({ data: uniqueIds.map((teacherId) => ({ courseId, teacherId })) });
    });
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, include: { department: { select: { id: true, name: true, code: true } }, teachers: { include: { teacher: { select: { id: true, fullName: true, email: true, code: true } } } }, _count: { select: { enrollments: true, modules: true } } } });
    return course ? this.mapTeachers(course) : null;
  }

  // Get student's grades breakdown  // Get student's grades breakdown for a course (quizzes, submissions, rubrics, cbtStatus, and progress)
  async getStudentGrades(courseId: string, studentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId: studentId,
        OR: [{ standaloneCourseId: courseId }, { curriculumItem: { courseId } }],
        status: EnrollmentStatus.ACTIVE,
      },
    });
    if (!enrollment) {
      throw new ForbiddenException('Та энэ курст идэвхтэй бүртгэлгүй байна');
    }

    const totalLessons = await this.prisma.lesson.count({
      where: { module: { courseId } },
    });

    const completedLessons = await this.prisma.progressLog.count({
      where: {
        studentId,
        completed: true,
        lesson: { module: { courseId } },
      },
    });

    const quizAttempts = await this.prisma.quizAttempt.findMany({
      where: {
        studentId,
        quiz: { lesson: { module: { courseId } } },
      },
      include: {
        quiz: {
          select: { title: true, passScore: true },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    const submissions = await this.prisma.submission.findMany({
      where: {
        studentId,
        assignment: { lesson: { module: { courseId } } },
      },
      include: {
        assignment: {
          select: { title: true },
        },
        rubricScores: { include: { criteria: { select: { description: true, points: true } }, evaluator: { select: { fullName: true, roles: true } } } },
        assets: { include: { asset: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return {
      cbtStatus: enrollment?.cbtStatus || 'NOT_EVALUATED',
      isActive: enrollment?.status === EnrollmentStatus.ACTIVE,
      progress: {
        totalLessons,
        completedLessons,
        percent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      },
      quizAttempts,
      submissions,
    };
  }
}
