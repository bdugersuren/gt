import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { EnrollmentStatus } from '@prisma/client';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  private activeEnrollmentWhere(studentId: string, courseId?: string) {
    const access: any = {
      studentId,
      status: EnrollmentStatus.ACTIVE,
      startDate: { lte: new Date() },
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    };
    if (courseId) {
      access.AND = [{ OR: [{ standaloneCourseId: courseId }, { curriculumItem: { courseId } }] }];
    }
    return access;
  }

  private async enrollments(studentId: string) {
    return this.prisma.enrollment.findMany({
      where: this.activeEnrollmentWhere(studentId),
      include: {
        standaloneCourse: { include: { modules: { include: { lessons: true } } } },
        curriculumItem: { include: { course: { include: { modules: { include: { lessons: true } } } } } },
        classGroup: { include: { program: true, academicYear: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private courseOf(enrollment: any) {
    return enrollment.standaloneCourse || enrollment.curriculumItem?.course;
  }

  private async assertCourse(studentId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({ where: this.activeEnrollmentWhere(studentId, courseId) });
    if (!enrollment) throw new ForbiddenException('Та энэ курст идэвхтэй бүртгэлгүй байна');
    return enrollment;
  }

  private async courseStats(studentId: string, course: any) {
    const lessons = course.modules.flatMap((module: any) => module.lessons);
    const logs = await this.prisma.progressLog.findMany({
      where: { studentId, lessonId: { in: lessons.map((lesson: any) => lesson.id) } },
    });
    const completed = logs.filter((log) => log.completed).length;
    return {
      id: course.id,
      title: course.title,
      code: course.code,
      description: course.description,
      progressPercent: lessons.length ? Math.round(completed / lessons.length * 100) : 0,
      totalLessons: lessons.length,
      completedLessons: completed,
    };
  }

  async dashboard(studentId: string) {
    const profile: any = await this.prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, code: true, avatarUrl: true } },
        classMemberships: {
          where: { isCurrent: true },
          include: { classGroup: { include: { program: true, academicYear: true } } },
        },
      },
    });
    if (!profile) throw new NotFoundException('Сурагчийн profile олдсонгүй');

    const enrollments = await this.enrollments(studentId);
    const courses = (await Promise.all(enrollments.map((enrollment) => this.courseOf(enrollment) ? this.courseStats(studentId, this.courseOf(enrollment)) : null))).filter(Boolean) as any[];
    const uniqueCourses = [...new Map(courses.map((course) => [course.id, course])).values()];
    const courseIds = uniqueCourses.map((course) => course.id);
    const assignments = await this.prisma.assignment.findMany({
      where: { lesson: { module: { courseId: { in: courseIds } } } },
      include: { submissions: { where: { studentId }, orderBy: { submittedAt: 'desc' }, take: 1 }, lesson: { include: { module: { select: { courseId: true } } } } },
      orderBy: { dueDate: 'asc' },
    });
    const attempts = await this.prisma.quizAttempt.findMany({ where: { studentId, quiz: { lesson: { module: { courseId: { in: courseIds } } } }, score: { not: null } }, select: { score: true } });
    const submitted = assignments.filter((assignment) => assignment.submissions.length > 0).length;
    const averageScore = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / attempts.length * 10) / 10 : null;
    const currentClass: any = profile.classMemberships[0]?.classGroup;
    const upcoming = assignments.filter((assignment) => assignment.submissions.length === 0 || (assignment.dueDate && assignment.dueDate > new Date())).slice(0, 8);
    return {
      student: {
        ...profile.user,
        status: profile.status,
        program: currentClass?.program ? { id: currentClass.program.id, name: currentClass.program.name } : null,
        currentClass: currentClass ? { id: currentClass.id, name: currentClass.name, code: currentClass.code } : null,
        academicYear: currentClass?.academicYear ? { id: currentClass.academicYear.id, name: currentClass.academicYear.name } : null,
      },
      summary: {
        enrolledCourses: uniqueCourses.length,
        completedCourses: uniqueCourses.filter((course) => course.progressPercent === 100).length,
        overallProgress: uniqueCourses.length ? Math.round(uniqueCourses.reduce((sum, course) => sum + course.progressPercent, 0) / uniqueCourses.length) : 0,
        averageScore,
        pendingAssignments: Math.max(0, assignments.length - submitted),
      },
      courses: uniqueCourses,
      upcoming: upcoming.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        dueDate: assignment.dueDate,
        courseId: assignment.lesson.module.courseId,
        submitted: assignment.submissions.length > 0,
      })),
    };
  }

  async progress(studentId: string, courseId?: string) {
    if (courseId) await this.assertCourse(studentId, courseId);
    return this.prisma.progressLog.findMany({
      where: { studentId, ...(courseId ? { lesson: { module: { courseId } } } : {}) },
      include: { lesson: { select: { id: true, title: true, moduleId: true } } },
      orderBy: { lastAccess: 'desc' },
    });
  }

  async grades(studentId: string) {
    const enrollments = await this.enrollments(studentId);
    const courses: any[] = [];
    const activities: any[] = [];
    for (const enrollment of enrollments) {
      const course = this.courseOf(enrollment);
      if (!course || courses.some((item) => item.course.id === course.id)) continue;
      const stats = await this.courseStats(studentId, course);
      const attempts = await this.prisma.quizAttempt.findMany({ where: { studentId, quiz: { lesson: { module: { courseId: course.id } } } }, select: { score: true, cbtResult: true, completedAt: true, quiz: { select: { title: true } } }, orderBy: { completedAt: 'desc' } });
      const submissions = await this.prisma.submission.findMany({ where: { studentId, assignment: { lesson: { module: { courseId: course.id } } } }, select: { finalScore: true, cbtResult: true, submittedAt: true, assignment: { select: { title: true } } }, orderBy: { submittedAt: 'desc' } });
      const scores = [...attempts.map((attempt) => attempt.score), ...submissions.map((submission) => submission.finalScore)].filter((score): score is number => score !== null);
      const finalScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 10) / 10 : null;
      const latestActivity = attempts[0]?.completedAt || submissions[0]?.submittedAt;
      courses.push({
        course: { id: course.id, code: course.code, title: course.title },
        enrollmentStatus: enrollment.status,
        progressPercent: stats.progressPercent,
        quizScore: attempts.find((attempt) => attempt.score !== null)?.score ?? null,
        assignmentScore: submissions.find((submission) => submission.finalScore !== null)?.finalScore ?? null,
        finalScore,
        cbtStatus: enrollment.cbtStatus,
        lastActivityAt: latestActivity,
      });
      attempts.slice(0, 5).forEach((attempt) => activities.push({ type: 'QUIZ', title: attempt.quiz.title, score: attempt.score, at: attempt.completedAt, courseId: course.id }));
      submissions.slice(0, 5).forEach((submission) => activities.push({ type: 'ASSIGNMENT', title: submission.assignment.title, score: submission.finalScore, at: submission.submittedAt, courseId: course.id }));
    }
    const available = courses.map((item) => item.finalScore).filter((score): score is number => score !== null);
    return {
      summary: {
        averageScore: available.length ? Math.round(available.reduce((sum, score) => sum + score, 0) / available.length * 10) / 10 : null,
        completedCourses: courses.filter((course) => course.progressPercent === 100).length,
        totalCourses: courses.length,
        competentCourses: courses.filter((course) => course.cbtStatus === 'COMPETENT').length,
      },
      courses,
      activities: activities.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime()),
    };
  }

  async lab(studentId: string, courseId?: string, status?: string) {
    const enrollments = await this.enrollments(studentId);
    const enrolledCourseIds = [...new Set(enrollments.map((enrollment) => this.courseOf(enrollment)?.id).filter(Boolean))] as string[];
    const allowedCourseIds = courseId ? enrolledCourseIds.filter((id) => id === courseId) : enrolledCourseIds;
    if (courseId && !allowedCourseIds.length) throw new ForbiddenException('Та энэ курст бүртгэлгүй байна');
    const assignments = await this.prisma.assignment.findMany({
      where: { lesson: { module: { courseId: { in: allowedCourseIds } } } },
      include: { lesson: { include: { module: { include: { course: true } } } }, submissions: { where: { studentId }, orderBy: { submittedAt: 'desc' }, take: 1 }, rubrics: { include: { criteria: true } } },
      orderBy: { dueDate: 'asc' },
    });
    return assignments.map((assignment) => {
      const latest = assignment.submissions[0];
      const currentStatus = latest ? (latest.finalScore === null ? 'SUBMITTED' : 'EVALUATED') : 'PENDING';
      return { id: assignment.id, title: assignment.title, description: assignment.description, dueDate: assignment.dueDate, course: assignment.lesson.module.course, lesson: { id: assignment.lesson.id, title: assignment.lesson.title }, maxScore: assignment.rubrics.flatMap((rubric) => rubric.criteria).reduce((sum, criteria) => sum + criteria.points, 0), status: currentStatus, latestSubmission: latest || null };
    }).filter((assignment) => !status || assignment.status === status);
  }

  async me(studentId: string) {
    const user: any = await this.prisma.user.findUnique({ where: { id: studentId }, select: { id: true, username: true, email: true, fullName: true, code: true, registerNumber: true, phone: true, avatarUrl: true, notificationEmail: true, notificationInApp: true, roles: true, studentProfile: { include: { classMemberships: { where: { isCurrent: true }, include: { classGroup: true } } } } } });
    if (!user) throw new NotFoundException('Хэрэглэгч олдсонгүй');
    return user;
  }

  async updateMe(studentId: string, data: { fullName?: string; phone?: string; avatarUrl?: string }) {
    return this.prisma.user.update({ where: { id: studentId }, data: { fullName: data.fullName?.trim(), phone: data.phone?.trim(), avatarUrl: data.avatarUrl?.trim() } });
  }

  async changePassword(studentId: string, data: { currentPassword: string; newPassword: string }) {
    if (!data.currentPassword || !data.newPassword || data.newPassword.length < 8) throw new BadRequestException('Нууц үг хамгийн багадаа 8 тэмдэгт байна');
    const user: any = await this.prisma.user.findUnique({ where: { id: studentId }, select: { passwordHash: true } });
    if (!user || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) throw new UnauthorizedException('Одоогийн нууц үг буруу байна');
    return this.prisma.user.update({ where: { id: studentId }, data: { passwordHash: await bcrypt.hash(data.newPassword, 10) }, select: { id: true } });
  }

  async getNote(studentId: string, lessonId: string) {
    await this.assertLesson(studentId, lessonId);
    return this.prisma.studentLessonNote.findUnique({ where: { studentId_lessonId: { studentId, lessonId } } });
  }

  async saveNote(studentId: string, lessonId: string, content: string) {
    await this.assertLesson(studentId, lessonId);
    return this.prisma.studentLessonNote.upsert({ where: { studentId_lessonId: { studentId, lessonId } }, create: { studentId, lessonId, content: content || '' }, update: { content: content || '' } });
  }

  async gates(studentId: string, lessonId: string) {
    await this.assertLesson(studentId, lessonId);
    return this.prisma.lessonGate.findMany({ where: { lessonId }, include: { quiz: { select: { id: true, title: true } } } });
  }

  private async assertLesson(studentId: string, lessonId: string) {
    const lesson: any = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, module: { select: { courseId: true } } } });
    if (!lesson) throw new NotFoundException('Лекц олдсонгүй');
    await this.assertCourse(studentId, lesson.module.courseId);
  }

  async preferences(studentId: string) {
    return this.prisma.user.findUnique({ where: { id: studentId }, select: { notificationEmail: true, notificationInApp: true } });
  }

  async updatePreferences(studentId: string, data: { notificationEmail?: boolean; notificationInApp?: boolean }) {
    return this.prisma.user.update({
      where: { id: studentId },
      data: {
        ...(data.notificationEmail !== undefined ? { notificationEmail: data.notificationEmail } : {}),
        ...(data.notificationInApp !== undefined ? { notificationInApp: data.notificationInApp } : {}),
      },
      select: { notificationEmail: true, notificationInApp: true },
    });
  }

}
