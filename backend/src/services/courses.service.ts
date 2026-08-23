import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, EnrollmentType, CBTStatus, EnrollmentStatus, Prisma } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  private pagination(pageValue?: string, pageSizeValue?: string) {
    const page = Math.max(1, Number.parseInt(pageValue || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(pageSizeValue || '20', 10) || 20));
    return { page, pageSize, skip: (page - 1) * pageSize };
  }

  // Find all courses based on role permissions and activeRole override
  async findAll(userId: string, roles: Role[], activeRole?: Role) {
    const roleToUse = activeRole && roles.includes(activeRole)
      ? activeRole
      : (roles.includes(Role.STUDENT) ? Role.STUDENT : roles[0]);

    if (roleToUse === Role.STUDENT) {
      // Get student's class group
      const student = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { classGroupId: true },
      });

      const classGroupId = student?.classGroupId;

      // Fetch enrolled courses (either via individual enrollment or class-batch enrollment)
      return this.prisma.course.findMany({
        where: {
          enrollments: {
            some: {
              OR: [
                { studentId: userId },
                classGroupId ? { classGroupId } : {},
              ],
              isActive: true,
            },
          },
        },
        include: {
          teachers: {
            select: { id: true, fullName: true, email: true },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
        },
      });
    }

    if (roleToUse === Role.TEACHER) {
      // Fetch courses taught by the teacher
      return this.prisma.course.findMany({
        where: {
          teachers: {
            some: { id: userId }
          }
        },
        include: {
          department: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: { enrollments: true, modules: true },
          },
        },
      });
    }

    // Admins and Managers see all courses
    return this.prisma.course.findMany({
      include: {
        teachers: {
          select: { id: true, fullName: true, email: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { enrollments: true, modules: true },
        },
      },
    });
  }

  // Find course details with modules and lessons list
  async findOne(id: string, userId: string, roles: Role[]) {
    await this.assertCourseAccess(id, userId, roles);
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        department: true,
        teachers: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                quizzes: {
                  include: {
                    quizQuestions: true,
                  },
                },
                assignments: {
                  include: {
                    rubrics: {
                      include: {
                        criteria: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Хичээл олдсонгүй');
    }

    return course;
  }

  private async assertCourseAccess(courseId: string, userId: string, roles: Role[]) {
    if (roles.includes(Role.ADMIN) || roles.includes(Role.MANAGER)) return;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { classGroupId: true } });
    const allowed = await this.prisma.course.count({
      where: {
        id: courseId,
        OR: [
          { teachers: { some: { id: userId } } },
          {
            enrollments: {
              some: {
                isActive: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() },
                OR: [
                  { studentId: userId },
                  ...(user?.classGroupId ? [{ classGroupId: user.classGroupId }] : []),
                ],
              },
            },
          },
        ],
      },
    });
    if (!allowed) throw new ForbiddenException('Энэ курст хандах эрхгүй байна');
  }

  // Create a new Course (Restricted to Managers)
  async create(data: {
    title: string;
    code: string;
    description?: string;
    coverImage?: string;
    isCBT: boolean;
    departmentId: string;
    teacherId: string;
  }) {
    const title = data.title.trim();
    const code = data.code.trim().toUpperCase();
    // Check if department exists
    const dept = await this.prisma.department.findUnique({
      where: { id: data.departmentId },
    });
    if (!dept) {
      throw new NotFoundException('Тэнхим олдсонгүй');
    }

    // Check if teacher exists and has TEACHER role
    const teacher = await this.prisma.user.findUnique({
      where: { id: data.teacherId },
    });
    if (!teacher || !teacher.roles.includes(Role.TEACHER)) {
      throw new BadRequestException('Заасан багш хүчингүй байна (TEACHER эрхтэй байх ёстой)');
    }

    // Check code duplication
    const existing = await this.prisma.course.findUnique({
      where: { code },
    });
    if (existing) {
      throw new ConflictException(`Давхардаж байна: ${code} кодтой хичээл аль хэдийн бүртгэгдсэн байна`);
    }

    return this.prisma.course.create({
      data: {
        title,
        code,
        description: data.description?.trim() || undefined,
        coverImage: data.coverImage,
        isCBT: data.isCBT,
        departmentId: data.departmentId,
        teachers: {
          connect: { id: data.teacherId }
        },
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        teachers: { select: { id: true, fullName: true, email: true, code: true } },
        _count: { select: { enrollments: true, modules: true } },
      },
    });
  }

  // Enroll student or class-batch to a course (Restricted to Managers)
  async enroll(
    courseId: string,
    data: {
      type: EnrollmentType;
      studentId?: string;
      classGroupId?: string;
      startDate: Date;
      endDate: Date;
    },
  ) {
    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Хичээл олдсонгүй');
    }

    if (data.type === EnrollmentType.INDIVIDUAL) {
      if (!data.studentId) {
        throw new BadRequestException('Суралцагчийн ID-г оруулна уу');
      }

      // Check student
      const student = await this.prisma.user.findUnique({
        where: { id: data.studentId },
      });
      if (!student || !student.roles.includes(Role.STUDENT)) {
        throw new BadRequestException('Суралцагч олдсонгүй');
      }

      // Check if already enrolled
      const existing = await this.prisma.enrollment.findFirst({
        where: {
          courseId,
          studentId: data.studentId,
        },
      });
      if (existing) {
        throw new ConflictException('Энэхүү суралцагч уг хичээлд аль хэдийн бүртгүүлсэн байна');
      }

      return this.prisma.enrollment.create({
        data: {
          type: EnrollmentType.INDIVIDUAL,
          courseId,
          studentId: data.studentId,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          isActive: true,
          cbtStatus: CBTStatus.NOT_EVALUATED,
        },
      });
    } else {
      if (!data.classGroupId) {
        throw new BadRequestException('Ангийн ID-г оруулна уу');
      }

      // Check class group
      const classGroup = await this.prisma.classGroup.findUnique({
        where: { id: data.classGroupId },
      });
      if (!classGroup) {
        throw new NotFoundException('Анги олдсонгүй');
      }

      // Check duplicate class enrollment
      const existing = await this.prisma.enrollment.findFirst({
        where: {
          courseId,
          classGroupId: data.classGroupId,
        },
      });
      if (existing) {
        throw new ConflictException('Энэхүү анги уг хичээлд аль хэдийн бүртгүүлсэн байна');
      }

      return this.prisma.enrollment.create({
        data: {
          type: EnrollmentType.CLASS_BATCH,
          courseId,
          classGroupId: data.classGroupId,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          isActive: true,
          cbtStatus: CBTStatus.NOT_EVALUATED,
        },
      });
    }
  }

  async getEnrollments(courseId: string, query: {
    status?: string; classGroupId?: string; search?: string; page?: string; pageSize?: string;
  }) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new NotFoundException('Хичээл олдсонгүй');
    if (query.status && !Object.values(EnrollmentStatus).includes(query.status as EnrollmentStatus)) {
      throw new BadRequestException('Бүртгэлийн төлөв буруу байна');
    }
    const { page, pageSize, skip } = this.pagination(query.page, query.pageSize);
    const status = query.status as EnrollmentStatus | undefined;
    const search = query.search?.trim();
    const where: Prisma.EnrollmentWhereInput = {
      courseId,
      studentId: { not: null },
      ...(status ? { status } : {}),
      ...(query.classGroupId ? { student: { classGroupId: query.classGroupId } } : {}),
      ...(search ? {
        student: {
          ...(query.classGroupId ? { classGroupId: query.classGroupId } : {}),
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        },
      } : {}),
    };
    const [items, total, statusRows, totalLessons, classGroups] = await this.prisma.$transaction([
      this.prisma.enrollment.findMany({
        where, skip, take: pageSize, orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { id: true, fullName: true, code: true, email: true, classGroup: { select: { id: true, name: true, code: true } } } },
        },
      }),
      this.prisma.enrollment.count({ where }),
      this.prisma.enrollment.findMany({ where: { courseId, studentId: { not: null } }, select: { status: true } }),
      this.prisma.lesson.count({ where: { module: { courseId } } }),
      this.prisma.classGroup.findMany({
        where: { students: { some: { enrollments: { some: { courseId } } } } },
        orderBy: { code: 'asc' }, select: { id: true, name: true, code: true },
      }),
    ]);
    const studentIds = items.flatMap((item) => item.studentId ? [item.studentId] : []);
    const progress = studentIds.length ? await this.prisma.progressLog.groupBy({
      by: ['studentId'],
      where: { studentId: { in: studentIds }, completed: true, lesson: { module: { courseId } } },
      _count: { _all: true },
    }) : [];
    const progressMap = new Map(progress.map((item) => [item.studentId, item._count._all]));
    return {
      items: items.map((item) => ({
        ...item,
        progress: {
          completedLessons: item.studentId ? progressMap.get(item.studentId) || 0 : 0,
          totalLessons,
          percent: totalLessons && item.studentId ? Math.round(((progressMap.get(item.studentId) || 0) / totalLessons) * 100) : 0,
        },
      })),
      counts: Object.fromEntries(Object.values(EnrollmentStatus).map((value) => [value, statusRows.filter((row) => row.status === value).length])),
      classGroups,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getEnrollmentCandidates(courseId: string, query: {
    classGroupId?: string; search?: string; page?: string; pageSize?: string;
  }) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true, departmentId: true } });
    if (!course) throw new NotFoundException('Хичээл олдсонгүй');
    const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1);
    const pageSize = Math.min(500, Math.max(1, Number.parseInt(query.pageSize || '100', 10) || 100));
    const skip = (page - 1) * pageSize;
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      roles: { has: Role.STUDENT },
      enrollments: { none: { courseId } },
      ...(query.classGroupId ? { classGroupId: query.classGroupId } : {}),
      ...(search ? { OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ] } : {}),
    };
    const [items, total, classes] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where, skip, take: pageSize, orderBy: [{ classGroup: { code: 'asc' } }, { fullName: 'asc' }],
        select: { id: true, fullName: true, code: true, email: true, classGroup: { select: { id: true, name: true, code: true } } },
      }),
      this.prisma.user.count({ where }),
      this.prisma.classGroup.findMany({
        where: { students: { some: { roles: { has: Role.STUDENT }, enrollments: { none: { courseId } } } } },
        orderBy: { code: 'asc' },
        select: { id: true, name: true, code: true, _count: { select: { students: { where: { roles: { has: Role.STUDENT }, enrollments: { none: { courseId } } } } } } },
      }),
    ]);
    return { items, classGroups: classes.map((item) => ({ id: item.id, name: item.name, code: item.code, count: item._count.students })), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async bulkEnroll(courseId: string, data: { studentIds: string[]; startDate: string; endDate: string }) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate < startDate) throw new BadRequestException('Дуусах огноо эхлэх огнооноос өмнө байж болохгүй');
    const [course, students, existing] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }),
      this.prisma.user.findMany({ where: { id: { in: data.studentIds } }, select: { id: true, roles: true } }),
      this.prisma.enrollment.findMany({ where: { courseId, studentId: { in: data.studentIds } }, select: { studentId: true } }),
    ]);
    if (!course) throw new NotFoundException('Хичээл олдсонгүй');
    if (students.length !== data.studentIds.length) throw new BadRequestException('Зарим суралцагч олдсонгүй');
    const nonStudents = students.filter((student) => !student.roles.includes(Role.STUDENT));
    if (nonStudents.length) throw new BadRequestException('STUDENT эрхгүй хэрэглэгч сонгогдсон байна');
    if (existing.length) throw new ConflictException('Сонгосон суралцагчдын зарим нь энэ курст бүртгэлтэй байна');
    const result = await this.prisma.$transaction(data.studentIds.map((studentId) => this.prisma.enrollment.create({
      data: { type: EnrollmentType.INDIVIDUAL, courseId, studentId, startDate, endDate, isActive: true, status: EnrollmentStatus.ACTIVE, cbtStatus: CBTStatus.NOT_EVALUATED },
      select: { id: true, studentId: true },
    })));
    return { courseId, enrolledCount: result.length, enrollmentIds: result.map((item) => item.id) };
  }

  async updateEnrollmentStatus(courseId: string, data: { enrollmentIds: string[]; status: EnrollmentStatus; reason?: string }, executorId: string) {
    const reason = data.reason?.trim();
    if (data.status === EnrollmentStatus.FAILED && !reason) throw new BadRequestException('Унасан төлөвт шалтгаан заавал оруулна');
    const count = await this.prisma.enrollment.count({ where: { id: { in: data.enrollmentIds }, courseId, studentId: { not: null } } });
    if (count !== data.enrollmentIds.length) throw new BadRequestException('Зарим enrollment олдсонгүй эсвэл өөр курст хамаарч байна');
    const result = await this.prisma.enrollment.updateMany({
      where: { id: { in: data.enrollmentIds }, courseId },
      data: {
        status: data.status,
        isActive: data.status === EnrollmentStatus.ACTIVE,
        statusReason: data.status === EnrollmentStatus.FAILED ? reason : null,
        statusChangedAt: new Date(),
        statusChangedById: executorId,
      },
    });
    return { courseId, status: data.status, updatedCount: result.count };
  }

  // Update course teachers (Restricted to Managers)
  async updateTeachers(courseId: string, teacherIds: string[]) {
    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Хичээл олдсонгүй');
    }

    const teachers = await this.prisma.user.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, roles: true },
    });
    const foundIds = new Set(teachers.map((teacher) => teacher.id));
    const missingIds = teacherIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new BadRequestException(`Багш олдсонгүй: ${missingIds.join(', ')}`);
    }
    const invalidRoleIds = teachers
      .filter((teacher) => !teacher.roles.includes(Role.TEACHER))
      .map((teacher) => teacher.id);
    if (invalidRoleIds.length > 0) {
      throw new BadRequestException(`TEACHER эрхгүй хэрэглэгч сонгогдсон байна: ${invalidRoleIds.join(', ')}`);
    }

    // Update teachers connection
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        teachers: {
          set: teacherIds.map((id) => ({ id })),
        },
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        teachers: {
          select: { id: true, fullName: true, email: true, code: true },
        },
        _count: { select: { enrollments: true, modules: true } },
      },
    });
  }

  // Get student's grades breakdown for a course (quizzes, submissions, rubrics, cbtStatus, and progress)
  async getStudentGrades(courseId: string, studentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        courseId,
        OR: [
          { studentId },
          {
            classGroup: {
              students: {
                some: { id: studentId },
              },
            },
          },
        ],
      },
    });

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
          select: { title: true, maxScore: true },
        },
        rubricScores: {
          include: {
            criteria: {
              select: { description: true, points: true },
            },
            evaluator: {
              select: { fullName: true, roles: true },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return {
      cbtStatus: enrollment?.cbtStatus || 'NOT_EVALUATED',
      isActive: enrollment?.isActive ?? false,
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
