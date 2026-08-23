import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, EnrollmentType, CBTStatus } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  // Find all courses based on role permissions and activeRole override
  async findAll(userId: string, roles: Role[], activeRole?: Role) {
    const roleToUse = activeRole || (roles.includes(Role.STUDENT) ? Role.STUDENT : roles[0]);

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
  async findOne(id: string) {
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
      where: { code: data.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Давхардаж байна: ${data.code} кодтой хичээл аль хэдийн бүртгэгдсэн байна`);
    }

    return this.prisma.course.create({
      data: {
        title: data.title,
        code: data.code.toUpperCase(),
        description: data.description,
        coverImage: data.coverImage,
        isCBT: data.isCBT,
        departmentId: data.departmentId,
        teachers: {
          connect: { id: data.teacherId }
        },
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

  // Update course teachers (Restricted to Managers)
  async updateTeachers(courseId: string, teacherIds: string[]) {
    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Хичээл олдсонгүй');
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
        teachers: {
          select: { id: true, fullName: true, email: true },
        },
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
